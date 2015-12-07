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
        'https://cdn.datatables.net/s/bs-3.3.5/dt-1.10.10,fh-3.1.0/datatables.min.css',
        'https://cdn.datatables.net/s/bs-3.3.5/dt-1.10.10,fh-3.1.0/datatables.min.js',        
		'site/labels/opstool-MPDReport.js'
).then(function(){
	AD.ui.loading.completed(2);
});