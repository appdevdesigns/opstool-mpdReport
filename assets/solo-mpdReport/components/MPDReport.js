//import $ from 'jquery';
import Controller from './controller.js';
import Start from './start.js';
import Upload from './upload.js';
import Memo from './memo.js';
import ReviewNS from './reviewNS.js';
import ReviewUS from './reviewUS.js';
import SendNS from './sendNS.js';
import SendUS from './sendUS.js';
import Translate from '../translate.js';

export default class MPDReport extends Controller {
	
	constructor(options) {
		options.template = '/solo-mpdReport/views/MPDReport.html';
		options.css = '/solo-mpdReport/css/mpdReport.css';
		super(options);	
		
		// Can be '#US' or '#NATIONAL'
		this.staffType = null;
		
		// Current active step.
		// "#start", "#upload", "#memo", "#reviewUS", "#reviewNS", "#sendUS", "#sendNS"
		this.step = '#start';
		
		// Ensure getMemoHTML() always knows what `this` is
		this.getMemoHTML = this.getMemoHTML.bind(this);
		
		// Initialize multilingual labels
		this.translate = new Translate({
			context: 'mpdreport',
			base: this.$element,
			loggingEnabled: true,
		});
	}
	
	
	initDOM() {
		var self = this;
		
		// Components for all steps
		this.steps = {
			'#start': new Start({
				element: this.$('#mpd-report-start'),
			}),
			'#upload': new Upload({
				element: this.$('#mpd-report-upload'),
			}),
			'#memo': new Memo({
				element: this.$('#mpd-report-memo'),
			}),
			'#reviewUS': new ReviewUS({
				element: this.$('#mpd-report-review-us'),
				memo: this.getMemoHTML,
			}),
			'#reviewNS': new ReviewNS({
				element: this.$('#mpd-report-review-ns'),
				memo: this.getMemoHTML,
			}),
			'#sendUS': new SendUS({
				element: this.$('#mpd-report-send-us'),
				memo: this.getMemoHTML,
			}),
			'#sendNS': new SendNS({
				element: this.$('#mpd-report-send-ns'),
				memo: this.getMemoHTML,
			})
		};
		
		// After a .CSV file is uploaded, tell ReviewUS controller to reload its data
		this.steps['#upload'].on('uploaded', () => {
			this.steps['#reviewUS'].fetchData();
		});
		
		// User navigated to different step
		this.$('ul.report-steps li a').on('click', function(ev) {
			var $a = $(this);
			ev.preventDefault();
			self.step = $a.attr('href');
			self.navigateToStep();
		});
		
		// User selected a staff type
		this.steps['#start'].on('selected', (staffType) => {
			this.setStaffType(staffType);
		});
		
		// Handle general events from all components
		for (var id in this.steps) {
			((step) => {
				
				// When a step is complete, automatically navigate to the next
				step.on('next', () => {
					// Each component declares what is next for a given staff type
					this.step = step.nextStep[ this.staffType ];
					this.navigateToStep();
				});
				
				// Display error messages
				step.on('error', (err) => {
					var $alert = this.$('#mpdreport-error-alert');
					$alert.find('p').text(err.message || err);
					$alert.slideDown();
				});
				
			})(this.steps[id]);
		}
		
		// Hide error message when closed
		this.$('#mpdreport-error-alert button.close').on('click', (ev) => {
			this.$('#mpdreport-error-alert').slideUp();
		});
		
		// Hide all step options at first
		this.$('ul.report-steps li').hide();
		
		this.navigateToStep();
	}
	
	
	
	/**
	 * Get the HTML from the Memo component.
	 *
	 * @return {string}
	 */
	getMemoHTML() {
		var result = this.steps['#memo'].getMemoHTML();
		return result;
	}
	
	
	
	/**
	 * Selects either NS or US staff type.
	 * @param {string} type
	 *		"#US" or "#NS"
	 */
	setStaffType(type) {
		type = type.toUpperCase();
		if (type == '#US' || type == '#NS') {
			this.staffType = type;
			// Use only the alphanumeric chars for the badge label
			var label = this.staffType.replace(/\W/g, '');
			this.$('.navbar-brand .badge').text(this.translate.t(label));
		}
		
		// Hide all step options first
		this.$('ul.report-steps li').hide();
		
		// Then show relevant step navigation options
		if (type != '#US') {
			this.$('.report-steps li.stafftype-ns').show();
			this.steps['#upload'].hide();
		}
		else {
			this.$('.report-steps li.stafftype-us').show();
		}
	}
	
	
	
	/**
	 * Navigate to the step in `this.step`
	 */
	navigateToStep() {
		// Must select staff type as the first step
		if (!this.staffType) {
			this.step = '#start';
		}
		
		// Toggle the step navigation "active" state
		// to show which is the current step.
		this.$('.report-steps li a.active').removeClass('active');
		this.$('.report-steps li a[href="' + this.step + '"]').addClass('active');
		
		// Hide all components
		this.$('.main-body > div').hide();
		
		// Show only the selected component for the active step
		if (this.steps[ this.step ]) {
			this.steps[this.step].show()
		}
		else {
			console.error('Navigated to unknown step', this);
		}
	}
	
	
	
	
}