import { UrlSegment, Tree, TreeNode, rootNode } from './segments';
import { BaseException } from 'angular2/src/facade/exceptions';
import { isBlank, isPresent, RegExpWrapper } from 'angular2/src/facade/lang';
export class RouterUrlSerializer {
}
export class DefaultRouterUrlSerializer extends RouterUrlSerializer {
    parse(url) {
        let root = new _UrlParser().parse(url);
        return new Tree(root);
    }
    serialize(tree) { return _serializeUrlTreeNode(rootNode(tree)); }
}
function _serializeUrlTreeNode(node) {
    return `${node.value}${_serializeChildren(node)}`;
}
function _serializeUrlTreeNodes(nodes) {
    let main = nodes[0].value.toString();
    let auxNodes = nodes.slice(1);
    let aux = auxNodes.length > 0 ? `(${auxNodes.map(_serializeUrlTreeNode).join("//")})` : "";
    let children = _serializeChildren(nodes[0]);
    return `${main}${aux}${children}`;
}
function _serializeChildren(node) {
    if (node.children.length > 0) {
        let slash = isBlank(node.children[0].value.segment) ? "" : "/";
        return `${slash}${_serializeUrlTreeNodes(node.children)}`;
    }
    else {
        return "";
    }
}
var SEGMENT_RE = RegExpWrapper.create('^[^\\/\\(\\)\\?;=&#]+');
function matchUrlSegment(str) {
    var match = RegExpWrapper.firstMatch(SEGMENT_RE, str);
    return isPresent(match) ? match[0] : '';
}
var QUERY_PARAM_VALUE_RE = RegExpWrapper.create('^[^\\(\\)\\?;&#]+');
function matchUrlQueryParamValue(str) {
    var match = RegExpWrapper.firstMatch(QUERY_PARAM_VALUE_RE, str);
    return isPresent(match) ? match[0] : '';
}
class _UrlParser {
    peekStartsWith(str) { return this._remaining.startsWith(str); }
    capture(str) {
        if (!this._remaining.startsWith(str)) {
            throw new BaseException(`Expected "${str}".`);
        }
        this._remaining = this._remaining.substring(str.length);
    }
    parse(url) {
        this._remaining = url;
        if (url == '' || url == '/') {
            return new TreeNode(new UrlSegment('', null, null), []);
        }
        else {
            return this.parseRoot();
        }
    }
    parseRoot() {
        let segments = this.parseSegments();
        let queryParams = this.peekStartsWith('?') ? this.parseQueryParams() : null;
        return new TreeNode(new UrlSegment('', queryParams, null), segments);
    }
    parseSegments(outletName = null) {
        if (this._remaining.length == 0) {
            return [];
        }
        if (this.peekStartsWith('/')) {
            this.capture('/');
        }
        var path = matchUrlSegment(this._remaining);
        this.capture(path);
        if (path.indexOf(":") > -1) {
            let parts = path.split(":");
            outletName = parts[0];
            path = parts[1];
        }
        var matrixParams = null;
        if (this.peekStartsWith(';')) {
            matrixParams = this.parseMatrixParams();
        }
        var aux = [];
        if (this.peekStartsWith('(')) {
            aux = this.parseAuxiliaryRoutes();
        }
        var children = [];
        if (this.peekStartsWith('/') && !this.peekStartsWith('//')) {
            this.capture('/');
            children = this.parseSegments();
        }
        if (isPresent(matrixParams)) {
            let matrixParamsSegment = new UrlSegment(null, matrixParams, null);
            let matrixParamsNode = new TreeNode(matrixParamsSegment, children);
            let segment = new UrlSegment(path, null, outletName);
            return [new TreeNode(segment, [matrixParamsNode].concat(aux))];
        }
        else {
            let segment = new UrlSegment(path, null, outletName);
            let node = new TreeNode(segment, children);
            return [node].concat(aux);
        }
    }
    parseQueryParams() {
        var params = {};
        this.capture('?');
        this.parseQueryParam(params);
        while (this._remaining.length > 0 && this.peekStartsWith('&')) {
            this.capture('&');
            this.parseQueryParam(params);
        }
        return params;
    }
    parseMatrixParams() {
        var params = {};
        while (this._remaining.length > 0 && this.peekStartsWith(';')) {
            this.capture(';');
            this.parseParam(params);
        }
        return params;
    }
    parseParam(params) {
        var key = matchUrlSegment(this._remaining);
        if (isBlank(key)) {
            return;
        }
        this.capture(key);
        var value = "true";
        if (this.peekStartsWith('=')) {
            this.capture('=');
            var valueMatch = matchUrlSegment(this._remaining);
            if (isPresent(valueMatch)) {
                value = valueMatch;
                this.capture(value);
            }
        }
        params[key] = value;
    }
    parseQueryParam(params) {
        var key = matchUrlSegment(this._remaining);
        if (isBlank(key)) {
            return;
        }
        this.capture(key);
        var value = "true";
        if (this.peekStartsWith('=')) {
            this.capture('=');
            var valueMatch = matchUrlQueryParamValue(this._remaining);
            if (isPresent(valueMatch)) {
                value = valueMatch;
                this.capture(value);
            }
        }
        params[key] = value;
    }
    parseAuxiliaryRoutes() {
        var segments = [];
        this.capture('(');
        while (!this.peekStartsWith(')') && this._remaining.length > 0) {
            segments = segments.concat(this.parseSegments("aux"));
            if (this.peekStartsWith('//')) {
                this.capture('//');
            }
        }
        this.capture(')');
        return segments;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3VybF9zZXJpYWxpemVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGlmZmluZ19wbHVnaW5fd3JhcHBlci1vdXRwdXRfcGF0aC15cnRVOXloNy50bXAvYW5ndWxhcjIvc3JjL2FsdF9yb3V0ZXIvcm91dGVyX3VybF9zZXJpYWxpemVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJPQUFPLEVBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFDLE1BQU0sWUFBWTtPQUN4RCxFQUFDLGFBQWEsRUFBQyxNQUFNLGdDQUFnQztPQUNyRCxFQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFDLE1BQU0sMEJBQTBCO0FBRzFFO0FBR0EsQ0FBQztBQUVELGdEQUFnRCxtQkFBbUI7SUFDakUsS0FBSyxDQUFDLEdBQVc7UUFDZixJQUFJLElBQUksR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQWEsSUFBSSxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELFNBQVMsQ0FBQyxJQUFzQixJQUFZLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0YsQ0FBQztBQUVELCtCQUErQixJQUEwQjtJQUN2RCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7QUFDcEQsQ0FBQztBQUVELGdDQUFnQyxLQUE2QjtJQUMzRCxJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ3JDLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDOUIsSUFBSSxHQUFHLEdBQUcsUUFBUSxDQUFDLE1B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dEIsQ0FBQztRQUNILENBQUM7UUFFRCxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDO0lBQ3RCLENBQUM7SUFFRCxvQkFBb0I7UUFDbEIsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDO1FBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFbEIsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDL0QsUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ3RELEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3JCLENBQUM7UUFDSCxDQUFDO1FBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVsQixNQUFNLENBQUMsUUFBUSxDQUFDO0lBQ2xCLENBQUM7QUFDSCxDQUFDO0FBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1VybFNlZ21lbnQsIFRyZWUsIFRyZWVOb2RlLCByb290Tm9kZX0gZnJvbSAnLi9zZWdtZW50cyc7XG5pbXBvcnQge0Jhc2VFeGNlcHRpb259IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvZXhjZXB0aW9ucyc7XG5pbXBvcnQge2lzQmxhbmssIGlzUHJlc2VudCwgUmVnRXhwV3JhcHBlcn0gZnJvbSAnYW5ndWxhcjIvc3JjL2ZhY2FkZS9sYW5nJztcbmltcG9ydCB7TGlzdFdyYXBwZXJ9IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvY29sbGVjdGlvbic7XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBSb3V0ZXJVcmxTZXJpYWxpemVyIHtcbiAgYWJzdHJhY3QgcGFyc2UodXJsOiBzdHJpbmcpOiBUcmVlPFVybFNlZ21lbnQ+O1xuICBhYnN0cmFjdCBzZXJpYWxpemUodHJlZTogVHJlZTxVcmxTZWdtZW50Pik6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIERlZmF1bHRSb3V0ZXJVcmxTZXJpYWxpemVyIGV4dGVuZHMgUm91dGVyVXJsU2VyaWFsaXplciB7XG4gIHBhcnNlKHVybDogc3RyaW5nKTogVHJlZTxVcmxTZWdtZW50PiB7XG4gICAgbGV0IHJvb3QgPSBuZXcgX1VybFBhcnNlcigpLnBhcnNlKHVybCk7XG4gICAgcmV0dXJuIG5ldyBUcmVlPFVybFNlZ21lbnQ+KHJvb3QpO1xuICB9XG5cbiAgc2VyaWFsaXplKHRyZWU6IFRyZWU8VXJsU2VnbWVudD4pOiBzdHJpbmcgeyByZXR1cm4gX3NlcmlhbGl6ZVVybFRyZWVOb2RlKHJvb3ROb2RlKHRyZWUpKTsgfVxufVxuXG5mdW5jdGlvbiBfc2VyaWFsaXplVXJsVHJlZU5vZGUobm9kZTogVHJlZU5vZGU8VXJsU2VnbWVudD4pOiBzdHJpbmcge1xuICByZXR1cm4gYCR7bm9kZS52YWx1ZX0ke19zZXJpYWxpemVDaGlsZHJlbihub2RlKX1gO1xufVxuXG5mdW5jdGlvbiBfc2VyaWFsaXplVXJsVHJlZU5vZGVzKG5vZGVzOiBUcmVlTm9kZTxVcmxTZWdtZW50PltdKTogc3RyaW5nIHtcbiAgbGV0IG1haW4gPSBub2Rlc1swXS52YWx1ZS50b1N0cmluZygpO1xuICBsZXQgYXV4Tm9kZXMgPSBub2Rlcy5zbGljZSgxKTtcbiAgbGV0IGF1eCA9IGF1eE5vZGVzLmxlbmd0aCA+IDAgPyBgKCR7YXV4Tm9kZXMubWFwKF9zZXJpYWxpemVVcmxUcmVlTm9kZSkuam9pbihcIi8vXCIpfSlgIDogXCJcIjtcbiAgbGV0IGNoaWxkcmVuID0gX3NlcmlhbGl6ZUNoaWxkcmVuKG5vZGVzWzBdKTtcbiAgcmV0dXJuIGAke21haW59JHthdXh9JHtjaGlsZHJlbn1gO1xufVxuXG5mdW5jdGlvbiBfc2VyaWFsaXplQ2hpbGRyZW4obm9kZTogVHJlZU5vZGU8VXJsU2VnbWVudD4pOiBzdHJpbmcge1xuICBpZiAobm9kZS5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgbGV0IHNsYXNoID0gaXNCbGFuayhub2RlLmNoaWxkcmVuWzBdLnZhbHVlLnNlZ21lbnQpID8gXCJcIiA6IFwiL1wiO1xuICAgIHJldHVybiBgJHtzbGFzaH0ke19zZXJpYWxpemVVcmxUcmVlTm9kZXMobm9kZS5jaGlsZHJlbil9YDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gXCJcIjtcbiAgfVxufVxuXG52YXIgU0VHTUVOVF9SRSA9IFJlZ0V4cFdyYXBwZXIuY3JlYXRlKCdeW15cXFxcL1xcXFwoXFxcXClcXFxcPzs9JiNdKycpO1xuZnVuY3Rpb24gbWF0Y2hVcmxTZWdtZW50KHN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgdmFyIG1hdGNoID0gUmVnRXhwV3JhcHBlci5maXJzdE1hdGNoKFNFR01FTlRfUkUsIHN0cik7XG4gIHJldHVybiBpc1ByZXNlbnQobWF0Y2gpID8gbWF0Y2hbMF0gOiAnJztcbn1cbnZhciBRVUVSWV9QQVJBTV9WQUxVRV9SRSA9IFJlZ0V4cFdyYXBwZXIuY3JlYXRlKCdeW15cXFxcKFxcXFwpXFxcXD87JiNdKycpO1xuZnVuY3Rpb24gbWF0Y2hVcmxRdWVyeVBhcmFtVmFsdWUoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICB2YXIgbWF0Y2ggPSBSZWdFeHBXcmFwcGVyLmZpcnN0TWF0Y2goUVVFUllfUEFSQU1fVkFMVUVfUkUsIHN0cik7XG4gIHJldHVybiBpc1ByZXNlbnQobWF0Y2gpID8gbWF0Y2hbMF0gOiAnJztcbn1cblxuY2xhc3MgX1VybFBhcnNlciB7XG4gIHByaXZhdGUgX3JlbWFpbmluZzogc3RyaW5nO1xuXG4gIHBlZWtTdGFydHNXaXRoKHN0cjogc3RyaW5nKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLl9yZW1haW5pbmcuc3RhcnRzV2l0aChzdHIpOyB9XG5cbiAgY2FwdHVyZShzdHI6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICghdGhpcy5fcmVtYWluaW5nLnN0YXJ0c1dpdGgoc3RyKSkge1xuICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oYEV4cGVjdGVkIFwiJHtzdHJ9XCIuYCk7XG4gICAgfVxuICAgIHRoaXMuX3JlbWFpbmluZyA9IHRoaXMuX3JlbWFpbmluZy5zdWJzdHJpbmcoc3RyLmxlbmd0aCk7XG4gIH1cblxuICBwYXJzZSh1cmw6IHN0cmluZyk6IFRyZWVOb2RlPFVybFNlZ21lbnQ+IHtcbiAgICB0aGlzLl9yZW1haW5pbmcgPSB1cmw7XG4gICAgaWYgKHVybCA9PSAnJyB8fCB1cmwgPT0gJy8nKSB7XG4gICAgICByZXR1cm4gbmV3IFRyZWVOb2RlPFVybFNlZ21lbnQ+KG5ldyBVcmxTZWdtZW50KCcnLCBudWxsLCBudWxsKSwgW10pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5wYXJzZVJvb3QoKTtcbiAgICB9XG4gIH1cblxuICBwYXJzZVJvb3QoKTogVHJlZU5vZGU8VXJsU2VnbWVudD4ge1xuICAgIGxldCBzZWdtZW50cyA9IHRoaXMucGFyc2VTZWdtZW50cygpO1xuICAgIGxldCBxdWVyeVBhcmFtcyA9IHRoaXMucGVla1N0YXJ0c1dpdGgoJz8nKSA/IHRoaXMucGFyc2VRdWVyeVBhcmFtcygpIDogbnVsbDtcbiAgICByZXR1cm4gbmV3IFRyZWVOb2RlPFVybFNlZ21lbnQ+KG5ldyBVcmxTZWdtZW50KCcnLCBxdWVyeVBhcmFtcywgbnVsbCksIHNlZ21lbnRzKTtcbiAgfVxuXG4gIHBhcnNlU2VnbWVudHMob3V0bGV0TmFtZTogc3RyaW5nID0gbnVsbCk6IFRyZWVOb2RlPFVybFNlZ21lbnQ+W10ge1xuICAgIGlmICh0aGlzLl9yZW1haW5pbmcubGVuZ3RoID09IDApIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgdGhpcy5jYXB0dXJlKCcvJyk7XG4gICAgfVxuICAgIHZhciBwYXRoID0gbWF0Y2hVcmxTZWdtZW50KHRoaXMuX3JlbWFpbmluZyk7XG4gICAgdGhpcy5jYXB0dXJlKHBhdGgpO1xuXG5cbiAgICBpZiAocGF0aC5pbmRleE9mKFwiOlwiKSA+IC0xKSB7XG4gICAgICBsZXQgcGFydHMgPSBwYXRoLnNwbGl0KFwiOlwiKTtcbiAgICAgIG91dGxldE5hbWUgPSBwYXJ0c1swXTtcbiAgICAgIHBhdGggPSBwYXJ0c1sxXTtcbiAgICB9XG5cbiAgICB2YXIgbWF0cml4UGFyYW1zOiB7W2tleTogc3RyaW5nXTogYW55fSA9IG51bGw7XG4gICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJzsnKSkge1xuICAgICAgbWF0cml4UGFyYW1zID0gdGhpcy5wYXJzZU1hdHJpeFBhcmFtcygpO1xuICAgIH1cblxuICAgIHZhciBhdXggPSBbXTtcbiAgICBpZiAodGhpcy5wZWVrU3RhcnRzV2l0aCgnKCcpKSB7XG4gICAgICBhdXggPSB0aGlzLnBhcnNlQXV4aWxpYXJ5Um91dGVzKCk7XG4gICAgfVxuXG4gICAgdmFyIGNoaWxkcmVuOiBUcmVlTm9kZTxVcmxTZWdtZW50PltdID0gW107XG4gICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJy8nKSAmJiAhdGhpcy5wZWVrU3RhcnRzV2l0aCgnLy8nKSkge1xuICAgICAgdGhpcy5jYXB0dXJlKCcvJyk7XG4gICAgICBjaGlsZHJlbiA9IHRoaXMucGFyc2VTZWdtZW50cygpO1xuICAgIH1cblxuICAgIGlmIChpc1ByZXNlbnQobWF0cml4UGFyYW1zKSkge1xuICAgICAgbGV0IG1hdHJpeFBhcmFtc1NlZ21lbnQgPSBuZXcgVXJsU2VnbWVudChudWxsLCBtYXRyaXhQYXJhbXMsIG51bGwpO1xuICAgICAgbGV0IG1hdHJpeFBhcmFtc05vZGUgPSBuZXcgVHJlZU5vZGU8VXJsU2VnbWVudD4obWF0cml4UGFyYW1zU2VnbWVudCwgY2hpbGRyZW4pO1xuICAgICAgbGV0IHNlZ21lbnQgPSBuZXcgVXJsU2VnbWVudChwYXRoLCBudWxsLCBvdXRsZXROYW1lKTtcbiAgICAgIHJldHVybiBbbmV3IFRyZWVOb2RlPFVybFNlZ21lbnQ+KHNlZ21lbnQsIFttYXRyaXhQYXJhbXNOb2RlXS5jb25jYXQoYXV4KSldO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgc2VnbWVudCA9IG5ldyBVcmxTZWdtZW50KHBhdGgsIG51bGwsIG91dGxldE5hbWUpO1xuICAgICAgbGV0IG5vZGUgPSBuZXcgVHJlZU5vZGU8VXJsU2VnbWVudD4oc2VnbWVudCwgY2hpbGRyZW4pO1xuICAgICAgcmV0dXJuIFtub2RlXS5jb25jYXQoYXV4KTtcbiAgICB9XG4gIH1cblxuICBwYXJzZVF1ZXJ5UGFyYW1zKCk6IHtba2V5OiBzdHJpbmddOiBhbnl9IHtcbiAgICB2YXIgcGFyYW1zOiB7W2tleTogc3RyaW5nXTogYW55fSA9IHt9O1xuICAgIHRoaXMuY2FwdHVyZSgnPycpO1xuICAgIHRoaXMucGFyc2VRdWVyeVBhcmFtKHBhcmFtcyk7XG4gICAgd2hpbGUgKHRoaXMuX3JlbWFpbmluZy5sZW5ndGggPiAwICYmIHRoaXMucGVla1N0YXJ0c1dpdGgoJyYnKSkge1xuICAgICAgdGhpcy5jYXB0dXJlKCcmJyk7XG4gICAgICB0aGlzLnBhcnNlUXVlcnlQYXJhbShwYXJhbXMpO1xuICAgIH1cbiAgICByZXR1cm4gcGFyYW1zO1xuICB9XG5cbiAgcGFyc2VNYXRyaXhQYXJhbXMoKToge1trZXk6IHN0cmluZ106IGFueX0ge1xuICAgIHZhciBwYXJhbXM6IHtba2V5OiBzdHJpbmddOiBhbnl9ID0ge307XG4gICAgd2hpbGUgKHRoaXMuX3JlbWFpbmluZy5sZW5ndGggPiAwICYmIHRoaXMucGVla1N0YXJ0c1dpdGgoJzsnKSkge1xuICAgICAgdGhpcy5jYXB0dXJlKCc7Jyk7XG4gICAgICB0aGlzLnBhcnNlUGFyYW0ocGFyYW1zKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtcztcbiAgfVxuXG4gIHBhcnNlUGFyYW0ocGFyYW1zOiB7W2tleTogc3RyaW5nXTogYW55fSk6IHZvaWQge1xuICAgIHZhciBrZXkgPSBtYXRjaFVybFNlZ21lbnQodGhpcy5fcmVtYWluaW5nKTtcbiAgICBpZiAoaXNCbGFuayhrZXkpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuY2FwdHVyZShrZXkpO1xuICAgIHZhciB2YWx1ZTogYW55ID0gXCJ0cnVlXCI7XG4gICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJz0nKSkge1xuICAgICAgdGhpcy5jYXB0dXJlKCc9Jyk7XG4gICAgICB2YXIgdmFsdWVNYXRjaCA9IG1hdGNoVXJsU2VnbWVudCh0aGlzLl9yZW1haW5pbmcpO1xuICAgICAgaWYgKGlzUHJlc2VudCh2YWx1ZU1hdGNoKSkge1xuICAgICAgICB2YWx1ZSA9IHZhbHVlTWF0Y2g7XG4gICAgICAgIHRoaXMuY2FwdHVyZSh2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcGFyYW1zW2tleV0gPSB2YWx1ZTtcbiAgfVxuXG4gIHBhcnNlUXVlcnlQYXJhbShwYXJhbXM6IHtba2V5OiBzdHJpbmddOiBhbnl9KTogdm9pZCB7XG4gICAgdmFyIGtleSA9IG1hdGNoVXJsU2VnbWVudCh0aGlzLl9yZW1haW5pbmcpO1xuICAgIGlmIChpc0JsYW5rKGtleSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5jYXB0dXJlKGtleSk7XG4gICAgdmFyIHZhbHVlOiBhbnkgPSBcInRydWVcIjtcbiAgICBpZiAodGhpcy5wZWVrU3RhcnRzV2l0aCgnPScpKSB7XG4gICAgICB0aGlzLmNhcHR1cmUoJz0nKTtcbiAgICAgIHZhciB2YWx1ZU1hdGNoID0gbWF0Y2hVcmxRdWVyeVBhcmFtVmFsdWUodGhpcy5fcmVtYWluaW5nKTtcbiAgICAgIGlmIChpc1ByZXNlbnQodmFsdWVNYXRjaCkpIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZU1hdGNoO1xuICAgICAgICB0aGlzLmNhcHR1cmUodmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHBhcmFtc1trZXldID0gdmFsdWU7XG4gIH1cblxuICBwYXJzZUF1eGlsaWFyeVJvdXRlcygpOiBUcmVlTm9kZTxVcmxTZWdtZW50PltdIHtcbiAgICB2YXIgc2VnbWVudHMgPSBbXTtcbiAgICB0aGlzLmNhcHR1cmUoJygnKTtcblxuICAgIHdoaWxlICghdGhpcy5wZWVrU3RhcnRzV2l0aCgnKScpICYmIHRoaXMuX3JlbWFpbmluZy5sZW5ndGggPiAwKSB7XG4gICAgICBzZWdtZW50cyA9IHNlZ21lbnRzLmNvbmNhdCh0aGlzLnBhcnNlU2VnbWVudHMoXCJhdXhcIikpO1xuICAgICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJy8vJykpIHtcbiAgICAgICAgdGhpcy5jYXB0dXJlKCcvLycpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmNhcHR1cmUoJyknKTtcblxuICAgIHJldHVybiBzZWdtZW50cztcbiAgfVxufVxuIl19