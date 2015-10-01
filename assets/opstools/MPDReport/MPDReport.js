steal(
        // List your Page's dependencies here:
        // 
        'appdev',
        function() {
            AD.ui.loading.resources(9);
        },
        'opstools/MPDReport/controllers/MPDReport.js',
        'opstools/MPDReport/balancereport-scratch.css'

).then(
		function() {
            AD.ui.loading.completed(7);
        },
		'dropzone.js',
		//'dropzone.css',
		'site/labels/opstool-MPDReport.js'
).then(function(){
	AD.ui.loading.completed(2);
});