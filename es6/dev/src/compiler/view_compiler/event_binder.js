import { isBlank, isPresent, StringWrapper } from 'angular2/src/facade/lang';
import { ListWrapper, StringMapWrapper } from 'angular2/src/facade/collection';
import { EventHandlerVars, ViewProperties } from './constants';
import * as o from '../output/output_ast';
import { CompileMethod } from './compile_method';
import { convertCdStatementToIr } from './expression_converter';
import { CompileBinding } from './compile_binding';
export class CompileEventListener {
    constructor(compileElement, eventTarget, eventName, listenerIndex) {
        this.compileElement = compileElement;
        this.eventTarget = eventTarget;
        this.eventName = eventName;
        this._hasComponentHostListener = false;
        this._actionResultExprs = [];
        this._method = new CompileMethod(compileElement.view);
        this._methodName =
            `_handle_${santitizeEventName(eventName)}_${compileElement.nodeIndex}_${listenerIndex}`;
        this._eventParam =
            new o.FnParam(EventHandlerVars.event.name, o.importType(this.compileElement.view.genConfig.renderTypes.renderEvent));
    }
    static getOrCreate(compileElement, eventTarget, eventName, targetEventListeners) {
        var listener = targetEventListeners.find(listener => listener.eventTarget == eventTarget &&
            listener.eventName == eventName);
        if (isBlank(listener)) {
            listener = new CompileEventListener(compileElement, eventTarget, eventName, targetEventListeners.length);
            targetEventListeners.push(listener);
        }
        return listener;
    }
    addAction(hostEvent, directive, directiveInstance) {
        if (isPresent(directive) && directive.isComponent) {
            this._hasComponentHostListener = true;
        }
        this._method.resetDebugInfo(this.compileElement.nodeIndex, hostEvent);
        var context = isPresent(directiveInstance) ? directiveInstance :
            this.compileElement.view.componentContext;
        var actionStmts = convertCdStatementToIr(this.compileElement.view, context, hostEvent.handler);
        var lastIndex = actionStmts.length - 1;
        if (lastIndex >= 0) {
            var lastStatement = actionStmts[lastIndex];
            var returnExpr = convertStmtIntoExpression(lastStatement);
            var preventDefaultVar = o.variable(`pd_${this._actionResultExprs.length}`);
            this._actionResultExprs.push(preventDefaultVar);
            if (isPresent(returnExpr)) {
                // Note: We need to cast the result of the method call to dynamic,
                // as it might be a void method!
                actionStmts[lastIndex] =
                    preventDefaultVar.set(returnExpr.cast(o.DYNAMIC_TYPE).notIdentical(o.literal(false)))
                        .toDeclStmt(null, [o.StmtModifier.Final]);
            }
        }
        this._method.addStmts(actionStmts);
    }
    finishMethod() {
        var markPathToRootStart = this._hasComponentHostListener ?
            this.compileElement.appElement.prop('componentView') :
            o.THIS_EXPR;
        var resultExpr = o.literal(true);
        this._actionResultExprs.forEach((expr) => { resultExpr = resultExpr.and(expr); });
        var stmts = [markPathToRootStart.callMethod('markPathToRootAsCheckOnce', []).toStmt()]
            .concat(this._method.finish())
            .concat([new o.ReturnStatement(resultExpr)]);
        this.compileElement.view.eventHandlerMethods.push(new o.ClassMethod(this._methodName, [this._eventParam], stmts, o.BOOL_TYPE, [o.StmtModifier.Private]));
    }
    listenToRenderer() {
        var listenExpr;
        var eventListener = o.THIS_EXPR.callMethod('eventHandler', [
            o.fn([this._eventParam], [
                new o.ReturnStatement(o.THIS_EXPR.callMethod(this._methodName, [EventHandlerVars.event]))
            ], o.BOOL_TYPE)
        ]);
        if (isPresent(this.eventTarget)) {
            listenExpr = ViewProperties.renderer.callMethod('listenGlobal', [o.literal(this.eventTarget), o.literal(this.eventName), eventListener]);
        }
        else {
            listenExpr = ViewProperties.renderer.callMethod('listen', [this.compileElement.renderNode, o.literal(this.eventName), eventListener]);
        }
        var disposable = o.variable(`disposable_${this.compileElement.view.disposables.length}`);
        this.compileElement.view.disposables.push(disposable);
        this.compileElement.view.createMethod.addStmt(disposable.set(listenExpr).toDeclStmt(o.FUNCTION_TYPE, [o.StmtModifier.Private]));
    }
    listenToDirective(directiveInstance, observablePropName) {
        var subscription = o.variable(`subscription_${this.compileElement.view.subscriptions.length}`);
        this.compileElement.view.subscriptions.push(subscription);
        var eventListener = o.THIS_EXPR.callMethod('eventHandler', [
            o.fn([this._eventParam], [o.THIS_EXPR.callMethod(this._methodName, [EventHandlerVars.event]).toStmt()])
        ]);
        this.compileElement.view.createMethod.addStmt(subscription.set(directiveInstance.prop(observablePropName)
            .callMethod(o.BuiltinMethod.SubscribeObservable, [eventListener]))
            .toDeclStmt(null, [o.StmtModifier.Final]));
    }
}
export function collectEventListeners(hostEvents, dirs, compileElement) {
    var eventListeners = [];
    hostEvents.forEach((hostEvent) => {
        compileElement.view.bindings.push(new CompileBinding(compileElement, hostEvent));
        var listener = CompileEventListener.getOrCreate(compileElement, hostEvent.target, hostEvent.name, eventListeners);
        listener.addAction(hostEvent, null, null);
    });
    ListWrapper.forEachWithIndex(dirs, (directiveAst, i) => {
        var directiveInstance = compileElement.directiveInstances[i];
        directiveAst.hostEvents.forEach((hostEvent) => {
            compileElement.view.bindings.push(new CompileBinding(compileElement, hostEvent));
            var listener = CompileEventListener.getOrCreate(compileElement, hostEvent.target, hostEvent.name, eventListeners);
            listener.addAction(hostEvent, directiveAst.directive, directiveInstance);
        });
    });
    eventListeners.forEach((listener) => listener.finishMethod());
    return eventListeners;
}
export function bindDirectiveOutputs(directiveAst, directiveInstance, eventListeners) {
    StringMapWrapper.forEach(directiveAst.directive.outputs, (eventName, observablePropName) => {
        eventListeners.filter(listener => listener.eventName == eventName)
            .forEach((listener) => { listener.listenToDirective(directiveInstance, observablePropName); });
    });
}
export function bindRenderOutputs(eventListeners) {
    eventListeners.forEach(listener => listener.listenToRenderer());
}
function convertStmtIntoExpression(stmt) {
    if (stmt instanceof o.ExpressionStatement) {
        return stmt.expr;
    }
    else if (stmt instanceof o.ReturnStatement) {
        return stmt.value;
    }
    return null;
}
function santitizeEventName(name) {
    return StringWrapper.replaceAll(name, /[^a-zA-Z_]/g, '_');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRfYmluZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGlmZmluZ19wbHVnaW5fd3JhcHBlci1vdXRwdXRfcGF0aC15cnRVOXloNy50bXAvYW5ndWxhcjIvc3JjL2NvbXBpbGVyL3ZpZXdfY29tcGlsZXIvZXZlbnRfYmluZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJPQUFPLEVBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUMsTUFBTSwwQkFBMEI7T0FDbkUsRUFBQyxXQUFXLEVBQUUsZ0JBQWdCLEVBQUMsTUFBTSxnQ0FBZ0M7T0FDckUsRUFBQyxnQkFBZ0IsRUFBRSxjQUFjLEVBQUMsTUFBTSxhQUFhO09BRXJELEtBQUssQ0FBQyxNQUFNLHNCQUFzQjtPQUVsQyxFQUFDLGFBQWEsRUFBQyxNQUFNLGtCQUFrQjtPQUt2QyxFQUFDLHNCQUFzQixFQUFDLE1BQU0sd0JBQXdCO09BQ3RELEVBQUMsY0FBYyxFQUFDLE1BQU0sbUJBQW1CO0FBRWhEO0lBbUJFLFlBQW1CLGNBQThCLEVBQVMsV0FBbUIsRUFDMUQsU0FBaUIsRUFBRSxhQUFxQjtRQUR4QyxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFBUyxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUMxRCxjQUFTLEdBQVQsU0FBUyxDQUFRO1FBbEI1Qiw4QkFBeUIsR0FBWSxLQUFLLENBQUM7UUFHM0MsdUJBQWtCLEdBQW1CLEVBQUUsQ0FBQztRQWdCOUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLGFBQWEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLFdBQVc7WUFDWixXQUFXLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxTQUFTLElBQUksYUFBYSxFQUFFLENBQUM7UUFDNUYsSUFBSSxDQUFDLFdBQVc7WUFDWixJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLElBQUksRUFDM0Is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LENBQUMsTUFBTSxDQUFDLFFBQVEsSUFBSSxRQUFRLENBQUMsU0FBUyxJQUFJLFNBQVMsQ0FBQzthQUM3RCxPQUFPLENBQ0osQ0FBQyxRQUFRLE9BQU8sUUFBUSxDQUFDLGlCQUFpQixDQUFDLGlCQUFpQixFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNoRyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxrQ0FBa0MsY0FBc0M7SUFDdEUsY0FBYyxDQUFDLE9BQU8sQ0FBQyxRQUFRLElBQUksUUFBUSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQztBQUNsRSxDQUFDO0FBRUQsbUNBQW1DLElBQWlCO0lBQ2xELEVBQUUsQ0FBQyxDQUFDLElBQUksWUFBWSxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ25CLENBQUM7SUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxZQUFZLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQ3BCLENBQUM7SUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQUVELDRCQUE0QixJQUFZO0lBQ3RDLE1BQU0sQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDNUQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7aXNCbGFuaywgaXNQcmVzZW50LCBTdHJpbmdXcmFwcGVyfSBmcm9tICdhbmd1bGFyMi9zcmMvZmFjYWRlL2xhbmcnO1xuaW1wb3J0IHtMaXN0V3JhcHBlciwgU3RyaW5nTWFwV3JhcHBlcn0gZnJvbSAnYW5ndWxhcjIvc3JjL2ZhY2FkZS9jb2xsZWN0aW9uJztcbmltcG9ydCB7RXZlbnRIYW5kbGVyVmFycywgVmlld1Byb3BlcnRpZXN9IGZyb20gJy4vY29uc3RhbnRzJztcblxuaW1wb3J0ICogYXMgbyBmcm9tICcuLi9vdXRwdXQvb3V0cHV0X2FzdCc7XG5pbXBvcnQge0NvbXBpbGVFbGVtZW50fSBmcm9tICcuL2NvbXBpbGVfZWxlbWVudCc7XG5pbXBvcnQge0NvbXBpbGVNZXRob2R9IGZyb20gJy4vY29tcGlsZV9tZXRob2QnO1xuXG5pbXBvcnQge0JvdW5kRXZlbnRBc3QsIERpcmVjdGl2ZUFzdH0gZnJvbSAnLi4vdGVtcGxhdGVfYXN0JztcbmltcG9ydCB7Q29tcGlsZURpcmVjdGl2ZU1ldGFkYXRhfSBmcm9tICcuLi9jb21waWxlX21ldGFkYXRhJztcblxuaW1wb3J0IHtjb252ZXJ0Q2RTdGF0ZW1lbnRUb0lyfSBmcm9tICcuL2V4cHJlc3Npb25fY29udmVydGVyJztcbmltcG9ydCB7Q29tcGlsZUJpbmRpbmd9IGZyb20gJy4vY29tcGlsZV9iaW5kaW5nJztcblxuZXhwb3J0IGNsYXNzIENvbXBpbGVFdmVudExpc3RlbmVyIHtcbiAgcHJpdmF0ZSBfbWV0aG9kOiBDb21waWxlTWV0aG9kO1xuICBwcml2YXRlIF9oYXNDb21wb25lbnRIb3N0TGlzdGVuZXI6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJpdmF0ZSBfbWV0aG9kTmFtZTogc3RyaW5nO1xuICBwcml2YXRlIF9ldmVudFBhcmFtOiBvLkZuUGFyYW07XG4gIHByaXZhdGUgX2FjdGlvblJlc3VsdEV4cHJzOiBvLkV4cHJlc3Npb25bXSA9IFtdO1xuXG4gIHN0YXRpYyBnZXRPckNyZWF0ZShjb21waWxlRWxlbWVudDogQ29tcGlsZUVsZW1lbnQsIGV2ZW50VGFyZ2V0OiBzdHJpbmcsIGV2ZW50TmFtZTogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnRMaXN0ZW5lcnM6IENvbXBpbGVFdmVudExpc3RlbmVyW10pOiBDb21waWxlRXZlbnRMaXN0ZW5lciB7XG4gICAgdmFyIGxpc3RlbmVyID0gdGFyZ2V0RXZlbnRMaXN0ZW5lcnMuZmluZChsaXN0ZW5lciA9PiBsaXN0ZW5lci5ldmVudFRhcmdldCA9PSBldmVudFRhcmdldCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXIuZXZlbnROYW1lID09IGV2ZW50TmFtZSk7XG4gICAgaWYgKGlzQmxhbmsobGlzdGVuZXIpKSB7XG4gICAgICBsaXN0ZW5lciA9IG5ldyBDb21waWxlRXZlbnRMaXN0ZW5lcihjb21waWxlRWxlbWVudCwgZXZlbnRUYXJnZXQsIGV2ZW50TmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldEV2ZW50TGlzdGVuZXJzLmxlbmd0aCk7XG4gICAgICB0YXJnZXRFdmVudExpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcbiAgICB9XG4gICAgcmV0dXJuIGxpc3RlbmVyO1xuICB9XG5cbiAgY29uc3RydWN0b3IocHVibGljIGNvbXBpbGVFbGVtZW50OiBDb21waWxlRWxlbWVudCwgcHVibGljIGV2ZW50VGFyZ2V0OiBzdHJpbmcsXG4gICAgICAgICAgICAgIHB1YmxpYyBldmVudE5hbWU6IHN0cmluZywgbGlzdGVuZXJJbmRleDogbnVtYmVyKSB7XG4gICAgdGhpcy5fbWV0aG9kID0gbmV3IENvbXBpbGVNZXRob2QoY29tcGlsZUVsZW1lbnQudmlldyk7XG4gICAgdGhpcy5fbWV0aG9kTmFtZSA9XG4gICAgICAgIGBfaGFuZGxlXyR7c2FudGl0aXplRXZlbnROYW1lKGV2ZW50TmFtZSl9XyR7Y29tcGlsZUVsZW1lbnQubm9kZUluZGV4fV8ke2xpc3RlbmVySW5kZXh9YDtcbiAgICB0aGlzLl9ldmVudFBhcmFtID1cbiAgICAgICAgbmV3IG8uRm5QYXJhbShFdmVudEhhbmRsZXJWYXJzLmV2ZW50Lm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgby5pbXBvcnRUeXBlKHRoaXMuY29tcGlsZUVsZW1lbnQudmlldy5nZW5Db25maWcucmVuZGVyVHlwZXMucmVuZGVyRXZlbnQpKTtcbiAgfVxuXG4gIGFkZEFjdGlvbihob3N0RXZlbnQ6IEJvdW5kRXZlbnRBc3QsIGRpcmVjdGl2ZTogQ29tcGlsZURpcmVjdGl2ZU1ldGFkYXRhLFxuICAgICAgICAgICAgZGlyZWN0aXZlSW5zdGFuY2U6IG8uRXhwcmVzc2lvbikge1xuICAgIGlmIChpc1ByZXNlbnQoZGlyZWN0aXZlKSAmJiBkaXJlY3RpdmUuaXNDb21wb25lbnQpIHtcbiAgICAgIHRoaXMuX2hhc0NvbXBvbmVudEhvc3RMaXN0ZW5lciA9IHRydWU7XG4gICAgfVxuICAgIHRoaXMuX21ldGhvZC5yZXNldERlYnVnSW5mbyh0aGlzLmNvbXBpbGVFbGVtZW50Lm5vZGVJbmRleCwgaG9zdEV2ZW50KTtcbiAgICB2YXIgY29udGV4dCA9IGlzUHJlc2VudChkaXJlY3RpdmVJbnN0YW5jZSkgPyBkaXJlY3RpdmVJbnN0YW5jZSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb21waWxlRWxlbWVudC52aWV3LmNvbXBvbmVudENvbnRleHQ7XG4gICAgdmFyIGFjdGlvblN0bXRzID0gY29udmVydENkU3RhdGVtZW50VG9Jcih0aGlzLmNvbXBpbGVFbGVtZW50LnZpZXcsIGNvbnRleHQsIGhvc3RFdmVudC5oYW5kbGVyKTtcbiAgICB2YXIgbGFzdEluZGV4ID0gYWN0aW9uU3RtdHMubGVuZ3RoIC0gMTtcbiAgICBpZiAobGFzdEluZGV4ID49IDApIHtcbiAgICAgIHZhciBsYXN0U3RhdGVtZW50ID0gYWN0aW9uU3RtdHNbbGFzdEluZGV4XTtcbiAgICAgIHZhciByZXR1cm5FeHByID0gY29udmVydFN0bXRJbnRvRXhwcmVzc2lvbihsYXN0U3RhdGVtZW50KTtcbiAgICAgIHZhciBwcmV2ZW50RGVmYXVsdFZhciA9IG8udmFyaWFibGUoYHBkXyR7dGhpcy5fYWN0aW9uUmVzdWx0RXhwcnMubGVuZ3RofWApO1xuICAgICAgdGhpcy5fYWN0aW9uUmVzdWx0RXhwcnMucHVzaChwcmV2ZW50RGVmYXVsdFZhcik7XG4gICAgICBpZiAoaXNQcmVzZW50KHJldHVybkV4cHIpKSB7XG4gICAgICAgIC8vIE5vdGU6IFdlIG5lZWQgdG8gY2FzdCB0aGUgcmVzdWx0IG9mIHRoZSBtZXRob2QgY2FsbCB0byBkeW5hbWljLFxuICAgICAgICAvLyBhcyBpdCBtaWdodCBiZSBhIHZvaWQgbWV0aG9kIVxuICAgICAgICBhY3Rpb25TdG10c1tsYXN0SW5kZXhdID1cbiAgICAgICAgICAgIHByZXZlbnREZWZhdWx0VmFyLnNldChyZXR1cm5FeHByLmNhc3Qoby5EWU5BTUlDX1RZUEUpLm5vdElkZW50aWNhbChvLmxpdGVyYWwoZmFsc2UpKSlcbiAgICAgICAgICAgICAgICAudG9EZWNsU3RtdChudWxsLCBbby5TdG10TW9kaWZpZXIuRmluYWxdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fbWV0aG9kLmFkZFN0bXRzKGFjdGlvblN0bXRzKTtcbiAgfVxuXG4gIGZpbmlzaE1ldGhvZCgpIHtcbiAgICB2YXIgbWFya1BhdGhUb1Jvb3RTdGFydCA9IHRoaXMuX2hhc0NvbXBvbmVudEhvc3RMaXN0ZW5lciA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb21waWxlRWxlbWVudC5hcHBFbGVtZW50LnByb3AoJ2NvbXBvbmVudFZpZXcnKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgby5USElTX0VYUFI7XG4gICAgdmFyIHJlc3VsdEV4cHI6IG8uRXhwcmVzc2lvbiA9IG8ubGl0ZXJhbCh0cnVlKTtcbiAgICB0aGlzLl9hY3Rpb25SZXN1bHRFeHBycy5mb3JFYWNoKChleHByKSA9PiB7IHJlc3VsdEV4cHIgPSByZXN1bHRFeHByLmFuZChleHByKTsgfSk7XG4gICAgdmFyIHN0bXRzID1cbiAgICAgICAgKDxvLlN0YXRlbWVudFtdPlttYXJrUGF0aFRvUm9vdFN0YXJ0LmNhbGxNZXRob2QoJ21hcmtQYXRoVG9Sb290QXNDaGVja09uY2UnLCBbXSkudG9TdG10KCldKVxuICAgICAgICAgICAgLmNvbmNhdCh0aGlzLl9tZXRob2QuZmluaXNoKCkpXG4gICAgICAgICAgICAuY29uY2F0KFtuZXcgby5SZXR1cm5TdGF0ZW1lbnQocmVzdWx0RXhwcildKTtcbiAgICB0aGlzLmNvbXBpbGVFbGVtZW50LnZpZXcuZXZlbnRIYW5kbGVyTWV0aG9kcy5wdXNoKG5ldyBvLkNsYXNzTWV0aG9kKFxuICAgICAgICB0aGlzLl9tZXRob2ROYW1lLCBbdGhpcy5fZXZlbnRQYXJhbV0sIHN0bXRzLCBvLkJPT0xfVFlQRSwgW28uU3RtdE1vZGlmaWVyLlByaXZhdGVdKSk7XG4gIH1cblxuICBsaXN0ZW5Ub1JlbmRlcmVyKCkge1xuICAgIHZhciBsaXN0ZW5FeHByO1xuICAgIHZhciBldmVudExpc3RlbmVyID0gby5USElTX0VYUFIuY2FsbE1ldGhvZCgnZXZlbnRIYW5kbGVyJywgW1xuICAgICAgby5mbihbdGhpcy5fZXZlbnRQYXJhbV0sXG4gICAgICAgICAgIFtcbiAgICAgICAgICAgICBuZXcgby5SZXR1cm5TdGF0ZW1lbnQoXG4gICAgICAgICAgICAgICAgIG8uVEhJU19FWFBSLmNhbGxNZXRob2QodGhpcy5fbWV0aG9kTmFtZSwgW0V2ZW50SGFuZGxlclZhcnMuZXZlbnRdKSlcbiAgICAgICAgICAgXSxcbiAgICAgICAgICAgby5CT09MX1RZUEUpXG4gICAgXSk7XG4gICAgaWYgKGlzUHJlc2VudCh0aGlzLmV2ZW50VGFyZ2V0KSkge1xuICAgICAgbGlzdGVuRXhwciA9IFZpZXdQcm9wZXJ0aWVzLnJlbmRlcmVyLmNhbGxNZXRob2QoXG4gICAgICAgICAgJ2xpc3Rlbkdsb2JhbCcsIFtvLmxpdGVyYWwodGhpcy5ldmVudFRhcmdldCksIG8ubGl0ZXJhbCh0aGlzLmV2ZW50TmFtZSksIGV2ZW50TGlzdGVuZXJdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdGVuRXhwciA9IFZpZXdQcm9wZXJ0aWVzLnJlbmRlcmVyLmNhbGxNZXRob2QoXG4gICAgICAgICAgJ2xpc3RlbicsIFt0aGlzLmNvbXBpbGVFbGVtZW50LnJlbmRlck5vZGUsIG8ubGl0ZXJhbCh0aGlzLmV2ZW50TmFtZSksIGV2ZW50TGlzdGVuZXJdKTtcbiAgICB9XG4gICAgdmFyIGRpc3Bvc2FibGUgPSBvLnZhcmlhYmxlKGBkaXNwb3NhYmxlXyR7dGhpcy5jb21waWxlRWxlbWVudC52aWV3LmRpc3Bvc2FibGVzLmxlbmd0aH1gKTtcbiAgICB0aGlzLmNvbXBpbGVFbGVtZW50LnZpZXcuZGlzcG9zYWJsZXMucHVzaChkaXNwb3NhYmxlKTtcbiAgICB0aGlzLmNvbXBpbGVFbGVtZW50LnZpZXcuY3JlYXRlTWV0aG9kLmFkZFN0bXQoXG4gICAgICAgIGRpc3Bvc2FibGUuc2V0KGxpc3RlbkV4cHIpLnRvRGVjbFN0bXQoby5GVU5DVElPTl9UWVBFLCBbby5TdG10TW9kaWZpZXIuUHJpdmF0ZV0pKTtcbiAgfVxuXG4gIGxpc3RlblRvRGlyZWN0aXZlKGRpcmVjdGl2ZUluc3RhbmNlOiBvLkV4cHJlc3Npb24sIG9ic2VydmFibGVQcm9wTmFtZTogc3RyaW5nKSB7XG4gICAgdmFyIHN1YnNjcmlwdGlvbiA9IG8udmFyaWFibGUoYHN1YnNjcmlwdGlvbl8ke3RoaXMuY29tcGlsZUVsZW1lbnQudmlldy5zdWJzY3JpcHRpb25zLmxlbmd0aH1gKTtcbiAgICB0aGlzLmNvbXBpbGVFbGVtZW50LnZpZXcuc3Vic2NyaXB0aW9ucy5wdXNoKHN1YnNjcmlwdGlvbik7XG4gICAgdmFyIGV2ZW50TGlzdGVuZXIgPSBvLlRISVNfRVhQUi5jYWxsTWV0aG9kKCdldmVudEhhbmRsZXInLCBbXG4gICAgICBvLmZuKFt0aGlzLl9ldmVudFBhcmFtXSxcbiAgICAgICAgICAgW28uVEhJU19FWFBSLmNhbGxNZXRob2QodGhpcy5fbWV0aG9kTmFtZSwgW0V2ZW50SGFuZGxlclZhcnMuZXZlbnRdKS50b1N0bXQoKV0pXG4gICAgXSk7XG4gICAgdGhpcy5jb21waWxlRWxlbWVudC52aWV3LmNyZWF0ZU1ldGhvZC5hZGRTdG10KFxuICAgICAgICBzdWJzY3JpcHRpb24uc2V0KGRpcmVjdGl2ZUluc3RhbmNlLnByb3Aob2JzZXJ2YWJsZVByb3BOYW1lKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2FsbE1ldGhvZChvLkJ1aWx0aW5NZXRob2QuU3Vic2NyaWJlT2JzZXJ2YWJsZSwgW2V2ZW50TGlzdGVuZXJdKSlcbiAgICAgICAgICAgIC50b0RlY2xTdG10KG51bGwsIFtvLlN0bXRNb2RpZmllci5GaW5hbF0pKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY29sbGVjdEV2ZW50TGlzdGVuZXJzKGhvc3RFdmVudHM6IEJvdW5kRXZlbnRBc3RbXSwgZGlyczogRGlyZWN0aXZlQXN0W10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBpbGVFbGVtZW50OiBDb21waWxlRWxlbWVudCk6IENvbXBpbGVFdmVudExpc3RlbmVyW10ge1xuICB2YXIgZXZlbnRMaXN0ZW5lcnM6IENvbXBpbGVFdmVudExpc3RlbmVyW10gPSBbXTtcbiAgaG9zdEV2ZW50cy5mb3JFYWNoKChob3N0RXZlbnQpID0+IHtcbiAgICBjb21waWxlRWxlbWVudC52aWV3LmJpbmRpbmdzLnB1c2gobmV3IENvbXBpbGVCaW5kaW5nKGNvbXBpbGVFbGVtZW50LCBob3N0RXZlbnQpKTtcbiAgICB2YXIgbGlzdGVuZXIgPSBDb21waWxlRXZlbnRMaXN0ZW5lci5nZXRPckNyZWF0ZShjb21waWxlRWxlbWVudCwgaG9zdEV2ZW50LnRhcmdldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3N0RXZlbnQubmFtZSwgZXZlbnRMaXN0ZW5lcnMpO1xuICAgIGxpc3RlbmVyLmFkZEFjdGlvbihob3N0RXZlbnQsIG51bGwsIG51bGwpO1xuICB9KTtcbiAgTGlzdFdyYXBwZXIuZm9yRWFjaFdpdGhJbmRleChkaXJzLCAoZGlyZWN0aXZlQXN0LCBpKSA9PiB7XG4gICAgdmFyIGRpcmVjdGl2ZUluc3RhbmNlID0gY29tcGlsZUVsZW1lbnQuZGlyZWN0aXZlSW5zdGFuY2VzW2ldO1xuICAgIGRpcmVjdGl2ZUFzdC5ob3N0RXZlbnRzLmZvckVhY2goKGhvc3RFdmVudCkgPT4ge1xuICAgICAgY29tcGlsZUVsZW1lbnQudmlldy5iaW5kaW5ncy5wdXNoKG5ldyBDb21waWxlQmluZGluZyhjb21waWxlRWxlbWVudCwgaG9zdEV2ZW50KSk7XG4gICAgICB2YXIgbGlzdGVuZXIgPSBDb21waWxlRXZlbnRMaXN0ZW5lci5nZXRPckNyZWF0ZShjb21waWxlRWxlbWVudCwgaG9zdEV2ZW50LnRhcmdldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvc3RFdmVudC5uYW1lLCBldmVudExpc3RlbmVycyk7XG4gICAgICBsaXN0ZW5lci5hZGRBY3Rpb24oaG9zdEV2ZW50LCBkaXJlY3RpdmVBc3QuZGlyZWN0aXZlLCBkaXJlY3RpdmVJbnN0YW5jZSk7XG4gICAgfSk7XG4gIH0pO1xuICBldmVudExpc3RlbmVycy5mb3JFYWNoKChsaXN0ZW5lcikgPT4gbGlzdGVuZXIuZmluaXNoTWV0aG9kKCkpO1xuICByZXR1cm4gZXZlbnRMaXN0ZW5lcnM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBiaW5kRGlyZWN0aXZlT3V0cHV0cyhkaXJlY3RpdmVBc3Q6IERpcmVjdGl2ZUFzdCwgZGlyZWN0aXZlSW5zdGFuY2U6IG8uRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudExpc3RlbmVyczogQ29tcGlsZUV2ZW50TGlzdGVuZXJbXSkge1xuICBTdHJpbmdNYXBXcmFwcGVyLmZvckVhY2goZGlyZWN0aXZlQXN0LmRpcmVjdGl2ZS5vdXRwdXRzLCAoZXZlbnROYW1lLCBvYnNlcnZhYmxlUHJvcE5hbWUpID0+IHtcbiAgICBldmVudExpc3RlbmVycy5maWx0ZXIobGlzdGVuZXIgPT4gbGlzdGVuZXIuZXZlbnROYW1lID09IGV2ZW50TmFtZSlcbiAgICAgICAgLmZvckVhY2goXG4gICAgICAgICAgICAobGlzdGVuZXIpID0+IHsgbGlzdGVuZXIubGlzdGVuVG9EaXJlY3RpdmUoZGlyZWN0aXZlSW5zdGFuY2UsIG9ic2VydmFibGVQcm9wTmFtZSk7IH0pO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJpbmRSZW5kZXJPdXRwdXRzKGV2ZW50TGlzdGVuZXJzOiBDb21waWxlRXZlbnRMaXN0ZW5lcltdKSB7XG4gIGV2ZW50TGlzdGVuZXJzLmZvckVhY2gobGlzdGVuZXIgPT4gbGlzdGVuZXIubGlzdGVuVG9SZW5kZXJlcigpKTtcbn1cblxuZnVuY3Rpb24gY29udmVydFN0bXRJbnRvRXhwcmVzc2lvbihzdG10OiBvLlN0YXRlbWVudCk6IG8uRXhwcmVzc2lvbiB7XG4gIGlmIChzdG10IGluc3RhbmNlb2Ygby5FeHByZXNzaW9uU3RhdGVtZW50KSB7XG4gICAgcmV0dXJuIHN0bXQuZXhwcjtcbiAgfSBlbHNlIGlmIChzdG10IGluc3RhbmNlb2Ygby5SZXR1cm5TdGF0ZW1lbnQpIHtcbiAgICByZXR1cm4gc3RtdC52YWx1ZTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gc2FudGl0aXplRXZlbnROYW1lKG5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBTdHJpbmdXcmFwcGVyLnJlcGxhY2VBbGwobmFtZSwgL1teYS16QS1aX10vZywgJ18nKTtcbn1cbiJdfQ==