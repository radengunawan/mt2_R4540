function clone(srcInstance) {
    if (typeof(srcInstance) != 'object' || srcInstance == null) {
        return srcInstance;
    }
    var newInstance = srcInstance.constructor();
    for (var i in srcInstance) {
        newInstance[i] = clone(srcInstance[i]);
    }
    return newInstance;
}