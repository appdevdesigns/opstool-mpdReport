//import $ from 'jquery';
import Component from './component.js';
import comm from '../comm.js';

/**
 * The region list must first be fetched from the server. After that, the 
 * user can select one of the available regions. The data from that region
 * is then fetched from the server, and rendered into a table.
 *
 * Note that this works differently from the US MPDReport Review controller,
 * even though the end result appears similar.
 */
export default class Memo extends Component {
	
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
			table: '/opstools/MPDReport/views/MPDReportReview/table.ejs',
		};
		super(options);
		
		this.getMemoHTML = options.memo;
		
		// Get regions from server
		this.currentRegion = null;
		this.regionList = [];
		this.regionsReady = comm.get('/nsmpdreport/regions')
		.then((data) => {
			this.regionList = data;
		})
		.catch((err) => {
			console.error('Unable to fetch regions', err);
		});
		
		
		this.nextStep = {
			'#NS': '#sendNS',
		};
	}
	
	
	initDOM() {
		this.displayFilters();
		this.on('regionSelected', (region) => {
			this.currentRegion = region;
			this.displayReport();
		});
		
		// Reload button
		this.$('.report-review-sidebar a[href="#reload"]').on('click', (ev) => {
			ev.preventDefault();
			this.displayReport();
		});
		
		// Preview button
		this.$('.report-review-sidebar a[href="#preview"]').on('click', (ev) => {
			ev.preventDefault();
			if (this.currentRegion) {
				window.open(
					'/nsmpdreport/email/preview'
					+ '?region=' + this.currentRegion
					+ '&memo=' + encodeURIComponent(this.getMemoHTML()),
					'_blank'
				);
			}
		});
	}
	
	
	/**
	 * Display the region filters
	 */
	displayFilters() {
		this.regionsReady.then(() => {
			var $ul = this.$('.region-filter');
			$ul.empty(); // remove old filters
			
			this.regionList.forEach((region) => {
				$ul.append(`
					<li class="nav-item">
						<a href="#" region="${region}" class="nav-link">${region}</a>
					</li>
				`);
			});
			
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
		});
	}
	
	
	/**
	 * Get report data from the server for the currently selected region.
	 *
	 * @return {Promise}
	 */
	fetchData() {
		if (this.currentRegion) {
			return comm.get({
				url: '/nsmpdreport/dataForRegion',
				qs: {
					region: this.currentRegion,
				}
			})
		}
		else {
			return Promise.resolve().then(() => {
				return null;
			});
		}
	}
	
	
	/**
	 * Display the report for the currently selected region.
	 */
	displayReport() {
		var $table = this.$('.report-review-table');
		var $spinner = this.$('.report-review-loading');
		$table.empty(); // remove old table
		$spinner.show();
		
		this.fetchData()
		.then((data) => {
			$spinner.hide();
			if (data) {
				// Add table HTML
				var html = this.subTemplates.table({
					dataSet: data,
					canDrillDown: false,
				})
				$table.html(html);
				
				// Make table sortable & searchable
				$table.find('table').DataTable({
					order: [[2, 'asc']],
					paging: false,
				});
			}
		})
		.catch((err) => {
			$spinner.hide();
			this.emit('error', err);
		});
	}
	
}