
var AD = require('ad-utils');
var path = require('path');


module.exports = {

    adapters:function(adapters) {
        combine({
            obj:adapters,
            file:['.', 'config', 'adapters.js'].join(path.sep),
            kind:'adapter'
        });
    },


    policies:function(policies) {
        combine({
            obj:policies,
            file:['.', 'config', 'policies.js'].join(path.sep),
            kind:'policy'
        });
    },


    routes:function(routes) {
        combine({
            obj:routes,
            file:['.', 'config', 'routes.js'].join(path.sep),
            kind:'route'
        });
    },
};



var combine = function( opts ) {

    var obj = opts.obj;
    var myObj = require(opts.file);
    for (var key in myObj) {

        if (typeof obj[key] == 'undefined') {
            obj[key] = myObj[key];
        } else {

            AD.log( '<yellow><bold>Warning:</bold> '+ moduleName() + ':  '+opts.kind+' ['+key+'] already defined in sails</yellow>');

        }
    }
};



var moduleName = function() {
    var dirName = __dirname;
    var parts = dirName.split(path.sep);
    return parts.pop();
};