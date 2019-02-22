//import $ from 'jquery';
import MPDReportComponent from './mpdReportComponent.js';
import comm from '../comm.js';

/**
 * After a CSV file has been uploaded to the server, this controller can
 * fetch the parsed data from '/mpdreport/data'. The data is then kept in
 * the `this.reportData` object. From there, it can be rendered into a table
 * depending on the selected region.
 *
 * Note that this works differently from the NS MPDReport Review controller,
 * even though the end result appears similar.
 */
export default class Memo extends MPDReportComponent {
	
	/**
	 * @param {object} options
	 * @param {element|string} options.element
	 * @param {string} options.template
	 * @param {function} options.memo
	 *		Function that returns the memo HTML.
	 */
	constructor(options) {
		options.template = options.template || '/solo-mpdReport/views/review.html';
		options.subTemplates = {
			table: '/opstools/MPDReport/views/MPDReportReview/tableUS.ejs',
		};
		super(options);
		
		this.getMemoHTML = options.memo;
		this.reportData = {
		/*
			staffByRegion: {
				<region>: { 
					<staffID>: { ... },
					...
				},
				...
			},
			missing: {
				<staffID>: { ... },
				...
			}
		*/
		};
		
		this.nextStep = {
			'#US': '#sendUS',
		};
	}
	
	
	initDOM() {
		var $spinner = this.$('.report-review-loading');
		
		this.on('regionSelected', (region) => {
			this.currentRegion = region;
			this.displayReport();
		});
		
		// Reload button
		this.$('.report-review-sidebar a[href="#reload"]').on('click', (ev) => {
			ev.preventDefault();
			$spinner.show();
			
			this.fetchData()
			.then(() => {
				$spinner.hide();
				this.displayReport();
			})
			.catch((err) => {
				console.error(err);
				$spinner.hide();
			});
		});
		
		// Preview button
		this.$('.report-review-sidebar a[href="#preview"]').on('click', (ev) => {
			ev.preventDefault();
			if (this.currentRegion) {
				window.open(
					'/usmpdreport/email/preview'
					+ '?region=' + this.currentRegion
					+ '&memo=' + encodeURIComponent(this.getMemoHTML()),
					'_blank'
				);
			}
		});
		
		this.fetchData();
	}
	
	
	/**
	 * Display the region filters
	 */
	displayFilters() {
		var $ul = this.$('.region-filter');
		$ul.empty(); // remove old filters
		
		this.regionList.forEach((region) => {
			$ul.append(`
				<li class="nav-item">
					<a href="#" region="${region}" class="nav-link">${region}</a>
				</li>
			`);
		});
		
		if (this.currentRegion) {
			$ul.find(`li[region="${this.currentRegion}"]`).addClass('active');
		};
		
		// Handle clicks on the filters
		$ul.find('li a').on('click', (ev) => {
			ev.preventDefault();
			var $a = $(ev.target);
			var region = $a.attr('region');
			
			// Toggle 'active' status
			$ul.find('li a').removeClass('active');
			$a.addClass('active');
			
			this.emit('regionSelected', region);
		});
	}
	
	
	
	/**
	 * Get the report data for all regions.
	 *
	 * @return {Promise}
	 */
	fetchData() {
		return comm.get('/mpdreport/data')
		.then((data) => {
			this.reportData = data;
			this.regionList = [];
			
			// Extract the regions from the data
			for (var region in this.reportData.staffByRegion) {
				this.regionList.push(region);
			}
			if (this.reportData.missing) {
				this.regionList.push('missing');
			}
			
			// Clear current region if needed
			if (this.regionList.indexOf(this.currentRegion) < 0) {
				this.currentRegion = null;
			}
			
			this.displayFilters();
		});
	}
	
	
	/**
	 * Display the report for the currently selected region.
	 */
	displayReport() {
		var $table = this.$('.report-review-table');
		$table.empty(); // remove old table
		
		var tableData;
		if (this.currentRegion == 'missing') {
			tableData = this.reportData.missing;
		} else {
			tableData = this.reportData.staffByRegion[this.currentRegion];
		}
		
		if (tableData) {
			var html = this.subTemplates.table({
				dataSet: tableData,
				canDrillDown: false,
			});
			$table.html(html);
			
			// Make table sortable and searchable
			$table.find('table').DataTable({
				order: [[2, 'asc']],
				paging: false,
			});
		}
	}
	
}

