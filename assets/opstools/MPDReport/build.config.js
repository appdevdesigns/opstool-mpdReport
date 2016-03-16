module.exports = {
    "paths": {
        "opstools/MPDReport": "opstools/MPDReport/MPDReport.js",
    },
    "bundle": ['opstools/MPDReport'],
	"meta": {
		"js/datatables.min": {
			"format": "global",
			"sideBundle": true,
			"deps": [
				'js/datatables.min.css'
			]
		},
		"opstools/MPDReport": {
            "deps": [
				'js/datatables.min',
				'dropzone'
            ]
        }
	}
};