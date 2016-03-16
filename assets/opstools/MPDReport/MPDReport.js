steal(
	// List your Page's dependencies here:
	'opstools/MPDReport/controllers/MPDReport.js',
	'opstools/MPDReport/balancereport-scratch.css',
	function() {
		System.import('appdev').then(function() {
			steal.import('appdev/ad').then(function() {
				AD.ui.loading.resources(9);
				AD.ui.loading.completed(9);
			});
		})
	}
);