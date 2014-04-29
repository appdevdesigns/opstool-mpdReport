steal(
        // List your Page's dependencies here:
        '/opstools/MPDReport/controllers/MPDReport.js'
).then(
        '/opstools/MPDReport/controllers/MPDReportType.js'
		, '/opstools/MPDReport/controllers/MPDReportUpload.js'
		, '/opstools/MPDReport/controllers/MPDReportReview.js'
		, '/opstools/MPDReport/controllers/MPDReportSend.js'
		, '/opstools/MPDReport/controllers/MPDReportSendNational.js'
).then(
		 'js/dropzone.min.js'
		,'styles/dropzone.css'
).then(function(){

});