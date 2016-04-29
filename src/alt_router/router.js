'use strict';"use strict";
var core_1 = require('angular2/core');
var lang_1 = require('angular2/src/facade/lang');
var async_1 = require('angular2/src/facade/async');
var collection_1 = require('angular2/src/facade/collection');
var exceptions_1 = require('angular2/src/facade/exceptions');
var recognize_1 = require('./recognize');
var segments_1 = require('./segments');
var lifecycle_reflector_1 = require('./lifecycle_reflector');
var constants_1 = require('./constants');
var RouterOutletMap = (function () {
    function RouterOutletMap() {
        /** @internal */
        this._outlets = {};
    }
    RouterOutletMap.prototype.registerOutlet = function (name, outlet) { this._outlets[name] = outlet; };
    return RouterOutletMap;
}());
exports.RouterOutletMap = RouterOutletMap;
var Router = (function () {
    function Router(_componentType, _componentResolver, _urlSerializer, _routerOutletMap, _location) {
        this._componentType = _componentType;
        this._componentResolver = _componentResolver;
        this._urlSerializer = _urlSerializer;
        this._routerOutletMap = _routerOutletMap;
        this._location = _location;
        this._changes = new async_1.EventEmitter();
        this.navigateByUrl(this._location.path());
    }
    Object.defineProperty(Router.prototype, "urlTree", {
        get: function () { return this._urlTree; },
        enumerable: true,
        configurable: true
    });
    Router.prototype.navigate = function (url) {
        var _this = this;
        this._urlTree = url;
        return recognize_1.recognize(this._componentResolver, this._componentType, url)
            .then(function (currTree) {
            new _LoadSegments(currTree, _this._prevTree).load(_this._routerOutletMap);
            _this._prevTree = currTree;
            _this._location.go(_this._urlSerializer.serialize(_this._urlTree));
            _this._changes.emit(null);
        });
    };
    Router.prototype.serializeUrl = function (url) { return this._urlSerializer.serialize(url); };
    Router.prototype.navigateByUrl = function (url) {
        return this.navigate(this._urlSerializer.parse(url));
    };
    Object.defineProperty(Router.prototype, "changes", {
        get: function () { return this._changes; },
        enumerable: true,
        configurable: true
    });
    return Router;
}());
exports.Router = Router;
var _LoadSegments = (function () {
    function _LoadSegments(currTree, prevTree) {
        this.currTree = currTree;
        this.prevTree = prevTree;
    }
    _LoadSegments.prototype.load = function (parentOutletMap) {
        var prevRoot = lang_1.isPresent(this.prevTree) ? segments_1.rootNode(this.prevTree) : null;
        var currRoot = segments_1.rootNode(this.currTree);
        this.loadChildSegments(currRoot, prevRoot, parentOutletMap);
    };
    _LoadSegments.prototype.loadSegments = function (currNode, prevNode, parentOutletMap) {
        var curr = currNode.value;
        var prev = lang_1.isPresent(prevNode) ? prevNode.value : null;
        var outlet = this.getOutlet(parentOutletMap, currNode.value);
        if (segments_1.equalSegments(curr, prev)) {
            this.loadChildSegments(currNode, prevNode, outlet.outletMap);
        }
        else {
            var outletMap = new RouterOutletMap();
            this.loadNewSegment(outletMap, curr, prev, outlet);
            this.loadChildSegments(currNode, prevNode, outletMap);
        }
    };
    _LoadSegments.prototype.loadNewSegment = function (outletMap, curr, prev, outlet) {
        var resolved = core_1.ReflectiveInjector.resolve([core_1.provide(RouterOutletMap, { useValue: outletMap }), core_1.provide(segments_1.RouteSegment, { useValue: curr })]);
        var ref = outlet.load(segments_1.routeSegmentComponentFactory(curr), resolved, outletMap);
        if (lifecycle_reflector_1.hasLifecycleHook("routerOnActivate", ref.instance)) {
            ref.instance.routerOnActivate(curr, prev, this.currTree, this.prevTree);
        }
    };
    _LoadSegments.prototype.loadChildSegments = function (currNode, prevNode, outletMap) {
        var _this = this;
        var prevChildren = lang_1.isPresent(prevNode) ?
            prevNode.children.reduce(function (m, c) {
                m[c.value.outlet] = c;
                return m;
            }, {}) :
            {};
        currNode.children.forEach(function (c) {
            _this.loadSegments(c, prevChildren[c.value.outlet], outletMap);
            collection_1.StringMapWrapper.delete(prevChildren, c.value.outlet);
        });
        collection_1.StringMapWrapper.forEach(prevChildren, function (v, k) { return _this.unloadOutlet(outletMap._outlets[k]); });
    };
    _LoadSegments.prototype.getOutlet = function (outletMap, segment) {
        var outlet = outletMap._outlets[segment.outlet];
        if (lang_1.isBlank(outlet)) {
            if (segment.outlet == constants_1.DEFAULT_OUTLET_NAME) {
                throw new exceptions_1.BaseException("Cannot find default outlet");
            }
            else {
                throw new exceptions_1.BaseException("Cannot find the outlet " + segment.outlet);
            }
        }
        return outlet;
    };
    _LoadSegments.prototype.unloadOutlet = function (outlet) {
        var _this = this;
        collection_1.StringMapWrapper.forEach(outlet.outletMap._outlets, function (v, k) { _this.unloadOutlet(v); });
        outlet.unload();
    };
    return _LoadSegments;
}());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGlmZmluZ19wbHVnaW5fd3JhcHBlci1vdXRwdXRfcGF0aC1CRWdvR0xCSC50bXAvYW5ndWxhcjIvc3JjL2FsdF9yb3V0ZXIvcm91dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxxQkFBcUUsZUFBZSxDQUFDLENBQUE7QUFFckYscUJBQXVDLDBCQUEwQixDQUFDLENBQUE7QUFDbEUsc0JBQXVDLDJCQUEyQixDQUFDLENBQUE7QUFDbkUsMkJBQStCLGdDQUFnQyxDQUFDLENBQUE7QUFDaEUsMkJBQTRCLGdDQUFnQyxDQUFDLENBQUE7QUFFN0QsMEJBQXdCLGFBQWEsQ0FBQyxDQUFBO0FBRXRDLHlCQVNPLFlBQVksQ0FBQyxDQUFBO0FBQ3BCLG9DQUErQix1QkFBdUIsQ0FBQyxDQUFBO0FBQ3ZELDBCQUFrQyxhQUFhLENBQUMsQ0FBQTtBQUVoRDtJQUFBO1FBQ0UsZ0JBQWdCO1FBQ2hCLGFBQVEsR0FBbUMsRUFBRSxDQUFDO0lBRWhELENBQUM7SUFEQyx3Q0FBYyxHQUFkLFVBQWUsSUFBWSxFQUFFLE1BQW9CLElBQVUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQzVGLHNCQUFDO0FBQUQsQ0FBQyxBQUpELElBSUM7QUFKWSx1QkFBZSxrQkFJM0IsQ0FBQTtBQUVEO0lBTUUsZ0JBQW9CLGNBQW9CLEVBQVUsa0JBQXFDLEVBQ25FLGNBQW1DLEVBQ25DLGdCQUFpQyxFQUFVLFNBQW1CO1FBRjlELG1CQUFjLEdBQWQsY0FBYyxDQUFNO1FBQVUsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFtQjtRQUNuRSxtQkFBYyxHQUFkLGNBQWMsQ0FBcUI7UUFDbkMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFpQjtRQUFVLGNBQVMsR0FBVCxTQUFTLENBQVU7UUFKMUUsYUFBUSxHQUF1QixJQUFJLG9CQUFZLEVBQVEsQ0FBQztRQUs5RCxJ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QXFCLE1BQW9CO1FBQXpDLGlCQUdDO1FBRkMsNkJBQWdCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFVBQUMsQ0FBQyxFQUFFLENBQUMsSUFBTyxLQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekYsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2xCLENBQUM7SUFDSCxvQkFBQztBQUFELENBQUMsQUFyRUQsSUFxRUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge09uSW5pdCwgcHJvdmlkZSwgUmVmbGVjdGl2ZUluamVjdG9yLCBDb21wb25lbnRSZXNvbHZlcn0gZnJvbSAnYW5ndWxhcjIvY29yZSc7XG5pbXBvcnQge1JvdXRlck91dGxldH0gZnJvbSAnLi9kaXJlY3RpdmVzL3JvdXRlcl9vdXRsZXQnO1xuaW1wb3J0IHtUeXBlLCBpc0JsYW5rLCBpc1ByZXNlbnR9IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvbGFuZyc7XG5pbXBvcnQge0V2ZW50RW1pdHRlciwgT2JzZXJ2YWJsZX0gZnJvbSAnYW5ndWxhcjIvc3JjL2ZhY2FkZS9hc3luYyc7XG5pbXBvcnQge1N0cmluZ01hcFdyYXBwZXJ9IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvY29sbGVjdGlvbic7XG5pbXBvcnQge0Jhc2VFeGNlcHRpb259IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvZXhjZXB0aW9ucyc7XG5pbXBvcnQge1JvdXRlclVybFNlcmlhbGl6ZXJ9IGZyb20gJy4vcm91dGVyX3VybF9zZXJpYWxpemVyJztcbmltcG9ydCB7cmVjb2duaXplfSBmcm9tICcuL3JlY29nbml6ZSc7XG5pbXBvcnQge0xvY2F0aW9ufSBmcm9tICdhbmd1bGFyMi9wbGF0Zm9ybS9jb21tb24nO1xuaW1wb3J0IHtcbiAgZXF1YWxTZWdtZW50cyxcbiAgcm91dGVTZWdtZW50Q29tcG9uZW50RmFjdG9yeSxcbiAgUm91dGVTZWdtZW50LFxuICBUcmVlLFxuICByb290Tm9kZSxcbiAgVHJlZU5vZGUsXG4gIFVybFNlZ21lbnQsXG4gIHNlcmlhbGl6ZVJvdXRlU2VnbWVudFRyZWVcbn0gZnJvbSAnLi9zZWdtZW50cyc7XG5pbXBvcnQge2hhc0xpZmVjeWNsZUhvb2t9IGZyb20gJy4vbGlmZWN5Y2xlX3JlZmxlY3Rvcic7XG5pbXBvcnQge0RFRkFVTFRfT1VUTEVUX05BTUV9IGZyb20gJy4vY29uc3RhbnRzJztcblxuZXhwb3J0IGNsYXNzIFJvdXRlck91dGxldE1hcCB7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX291dGxldHM6IHtbbmFtZTogc3RyaW5nXTogUm91dGVyT3V0bGV0fSA9IHt9O1xuICByZWdpc3Rlck91dGxldChuYW1lOiBzdHJpbmcsIG91dGxldDogUm91dGVyT3V0bGV0KTogdm9pZCB7IHRoaXMuX291dGxldHNbbmFtZV0gPSBvdXRsZXQ7IH1cbn1cblxuZXhwb3J0IGNsYXNzIFJvdXRlciB7XG4gIHByaXZhdGUgX3ByZXZUcmVlOiBUcmVlPFJvdXRlU2VnbWVudD47XG4gIHByaXZhdGUgX3VybFRyZWU6IFRyZWU8VXJsU2VnbWVudD47XG5cbiAgcHJpdmF0ZSBfY2hhbmdlczogRXZlbnRFbWl0dGVyPHZvaWQ+ID0gbmV3IEV2ZW50RW1pdHRlcjx2b2lkPigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgX2NvbXBvbmVudFR5cGU6IFR5cGUsIHByaXZhdGUgX2NvbXBvbmVudFJlc29sdmVyOiBDb21wb25lbnRSZXNvbHZlcixcbiAgICAgICAgICAgICAgcHJpdmF0ZSBfdXJsU2VyaWFsaXplcjogUm91dGVyVXJsU2VyaWFsaXplcixcbiAgICAgICAgICAgICAgcHJpdmF0ZSBfcm91dGVyT3V0bGV0TWFwOiBSb3V0ZXJPdXRsZXRNYXAsIHByaXZhdGUgX2xvY2F0aW9uOiBMb2NhdGlvbikge1xuICAgIHRoaXMubmF2aWdhdGVCeVVybCh0aGlzLl9sb2NhdGlvbi5wYXRoKCkpO1xuICB9XG5cbiAgZ2V0IHVybFRyZWUoKTogVHJlZTxVcmxTZWdtZW50PiB7IHJldHVybiB0aGlzLl91cmxUcmVlOyB9XG5cbiAgbmF2aWdhdGUodXJsOiBUcmVlPFVybFNlZ21lbnQ+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5fdXJsVHJlZSA9IHVybDtcbiAgICByZXR1cm4gcmVjb2duaXplKHRoaXMuX2NvbXBvbmVudFJlc29sdmVyLCB0aGlzLl9jb21wb25lbnRUeXBlLCB1cmwpXG4gICAgICAgIC50aGVuKGN1cnJUcmVlID0+IHtcbiAgICAgICAgICBuZXcgX0xvYWRTZWdtZW50cyhjdXJyVHJlZSwgdGhpcy5fcHJldlRyZWUpLmxvYWQodGhpcy5fcm91dGVyT3V0bGV0TWFwKTtcbiAgICAgICAgICB0aGlzLl9wcmV2VHJlZSA9IGN1cnJUcmVlO1xuICAgICAgICAgIHRoaXMuX2xvY2F0aW9uLmdvKHRoaXMuX3VybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHRoaXMuX3VybFRyZWUpKTtcbiAgICAgICAgICB0aGlzLl9jaGFuZ2VzLmVtaXQobnVsbCk7XG4gICAgICAgIH0pO1xuICB9XG5cbiAgc2VyaWFsaXplVXJsKHVybDogVHJlZTxVcmxTZWdtZW50Pik6IHN0cmluZyB7IHJldHVybiB0aGlzLl91cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh1cmwpOyB9XG5cbiAgbmF2aWdhdGVCeVVybCh1cmw6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiB0aGlzLm5hdmlnYXRlKHRoaXMuX3VybFNlcmlhbGl6ZXIucGFyc2UodXJsKSk7XG4gIH1cblxuICBnZXQgY2hhbmdlcygpOiBPYnNlcnZhYmxlPHZvaWQ+IHsgcmV0dXJuIHRoaXMuX2NoYW5nZXM7IH1cbn1cblxuY2xhc3MgX0xvYWRTZWdtZW50cyB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgY3VyclRyZWU6IFRyZWU8Um91dGVTZWdtZW50PiwgcHJpdmF0ZSBwcmV2VHJlZTogVHJlZTxSb3V0ZVNlZ21lbnQ+KSB7fVxuXG4gIGxvYWQocGFyZW50T3V0bGV0TWFwOiBSb3V0ZXJPdXRsZXRNYXApOiB2b2lkIHtcbiAgICBsZXQgcHJldlJvb3QgPSBpc1ByZXNlbnQodGhpcy5wcmV2VHJlZSkgPyByb290Tm9kZSh0aGlzLnByZXZUcmVlKSA6IG51bGw7XG4gICAgbGV0IGN1cnJSb290ID0gcm9vdE5vZGUodGhpcy5jdXJyVHJlZSk7XG4gICAgdGhpcy5sb2FkQ2hpbGRTZWdtZW50cyhjdXJyUm9vdCwgcHJldlJvb3QsIHBhcmVudE91dGxldE1hcCk7XG4gIH1cblxuICBsb2FkU2VnbWVudHMoY3Vyck5vZGU6IFRyZWVOb2RlPFJvdXRlU2VnbWVudD4sIHByZXZOb2RlOiBUcmVlTm9kZTxSb3V0ZVNlZ21lbnQ+LFxuICAgICAgICAgICAgICAgcGFyZW50T3V0bGV0TWFwOiBSb3V0ZXJPdXRsZXRNYXApOiB2b2lkIHtcbiAgICBsZXQgY3VyciA9IGN1cnJOb2RlLnZhbHVlO1xuICAgIGxldCBwcmV2ID0gaXNQcmVzZW50KHByZXZOb2RlKSA/IHByZXZOb2RlLnZhbHVlIDogbnVsbDtcbiAgICBsZXQgb3V0bGV0ID0gdGhpcy5nZXRPdXRsZXQocGFyZW50T3V0bGV0TWFwLCBjdXJyTm9kZS52YWx1ZSk7XG5cbiAgICBpZiAoZXF1YWxTZWdtZW50cyhjdXJyLCBwcmV2KSkge1xuICAgICAgdGhpcy5sb2FkQ2hpbGRTZWdtZW50cyhjdXJyTm9kZSwgcHJldk5vZGUsIG91dGxldC5vdXRsZXRNYXApO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgb3V0bGV0TWFwID0gbmV3IFJvdXRlck91dGxldE1hcCgpO1xuICAgICAgdGhpcy5sb2FkTmV3U2VnbWVudChvdXRsZXRNYXAsIGN1cnIsIHByZXYsIG91dGxldCk7XG4gICAgICB0aGlzLmxvYWRDaGlsZFNlZ21lbnRzKGN1cnJOb2RlLCBwcmV2Tm9kZSwgb3V0bGV0TWFwKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGxvYWROZXdTZWdtZW50KG91dGxldE1hcDogUm91dGVyT3V0bGV0TWFwLCBjdXJyOiBSb3V0ZVNlZ21lbnQsIHByZXY6IFJvdXRlU2VnbWVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBvdXRsZXQ6IFJvdXRlck91dGxldCk6IHZvaWQge1xuICAgIGxldCByZXNvbHZlZCA9IFJlZmxlY3RpdmVJbmplY3Rvci5yZXNvbHZlKFxuICAgICAgICBbcHJvdmlkZShSb3V0ZXJPdXRsZXRNYXAsIHt1c2VWYWx1ZTogb3V0bGV0TWFwfSksIHByb3ZpZGUoUm91dGVTZWdtZW50LCB7dXNlVmFsdWU6IGN1cnJ9KV0pO1xuICAgIGxldCByZWYgPSBvdXRsZXQubG9hZChyb3V0ZVNlZ21lbnRDb21wb25lbnRGYWN0b3J5KGN1cnIpLCByZXNvbHZlZCwgb3V0bGV0TWFwKTtcbiAgICBpZiAoaGFzTGlmZWN5Y2xlSG9vayhcInJvdXRlck9uQWN0aXZhdGVcIiwgcmVmLmluc3RhbmNlKSkge1xuICAgICAgcmVmLmluc3RhbmNlLnJvdXRlck9uQWN0aXZhdGUoY3VyciwgcHJldiwgdGhpcy5jdXJyVHJlZSwgdGhpcy5wcmV2VHJlZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBsb2FkQ2hpbGRTZWdtZW50cyhjdXJyTm9kZTogVHJlZU5vZGU8Um91dGVTZWdtZW50PiwgcHJldk5vZGU6IFRyZWVOb2RlPFJvdXRlU2VnbWVudD4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0bGV0TWFwOiBSb3V0ZXJPdXRsZXRNYXApOiB2b2lkIHtcbiAgICBsZXQgcHJldkNoaWxkcmVuID0gaXNQcmVzZW50KHByZXZOb2RlKSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBwcmV2Tm9kZS5jaGlsZHJlbi5yZWR1Y2UoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKG0sIGMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1bYy52YWx1ZS5vdXRsZXRdID0gYztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBtO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge30pIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHt9O1xuXG4gICAgY3Vyck5vZGUuY2hpbGRyZW4uZm9yRWFjaChjID0+IHtcbiAgICAgIHRoaXMubG9hZFNlZ21lbnRzKGMsIHByZXZDaGlsZHJlbltjLnZhbHVlLm91dGxldF0sIG91dGxldE1hcCk7XG4gICAgICBTdHJpbmdNYXBXcmFwcGVyLmRlbGV0ZShwcmV2Q2hpbGRyZW4sIGMudmFsdWUub3V0bGV0KTtcbiAgICB9KTtcblxuICAgIFN0cmluZ01hcFdyYXBwZXIuZm9yRWFjaChwcmV2Q2hpbGRyZW4sICh2LCBrKSA9PiB0aGlzLnVubG9hZE91dGxldChvdXRsZXRNYXAuX291dGxldHNba10pKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0T3V0bGV0KG91dGxldE1hcDogUm91dGVyT3V0bGV0TWFwLCBzZWdtZW50OiBSb3V0ZVNlZ21lbnQpOiBSb3V0ZXJPdXRsZXQge1xuICAgIGxldCBvdXRsZXQgPSBvdXRsZXRNYXAuX291dGxldHNbc2VnbWVudC5vdXRsZXRdO1xuICAgIGlmIChpc0JsYW5rKG91dGxldCkpIHtcbiAgICAgIGlmIChzZWdtZW50Lm91dGxldCA9PSBERUZBVUxUX09VVExFVF9OQU1FKSB7XG4gICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKGBDYW5ub3QgZmluZCBkZWZhdWx0IG91dGxldGApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oYENhbm5vdCBmaW5kIHRoZSBvdXRsZXQgJHtzZWdtZW50Lm91dGxldH1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG91dGxldDtcbiAgfVxuXG4gIHByaXZhdGUgdW5sb2FkT3V0bGV0KG91dGxldDogUm91dGVyT3V0bGV0KTogdm9pZCB7XG4gICAgU3RyaW5nTWFwV3JhcHBlci5mb3JFYWNoKG91dGxldC5vdXRsZXRNYXAuX291dGxldHMsICh2LCBrKSA9PiB7IHRoaXMudW5sb2FkT3V0bGV0KHYpOyB9KTtcbiAgICBvdXRsZXQudW5sb2FkKCk7XG4gIH1cbn0iXX0=