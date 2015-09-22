steal(
        // List your Page's dependencies here:
        'opstools/MPDReport/controllers/MPDReport.js',
        'opstools/MPDReport/balancereport-scratch.css'
).then(
        'opstools/MPDReport/controllers/MPDReportType.js'
		, 'opstools/MPDReport/controllers/MPDReportUpload.js'
		, 'opstools/MPDReport/controllers/MPDReportReview.js'
		, 'opstools/MPDReport/controllers/MPDReportSend.js'
		, 'opstools/MPDReport/controllers/MPDReportSendNational.js'
).then(
		'dropzone.js',
		//'dropzone.css',
		'site/labels/opstool-MPDReport.js'
).then(function(){

});