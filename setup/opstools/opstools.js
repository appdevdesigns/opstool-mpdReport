/**
 * This file specifies any default Ops Portal Tool Definitions 
 * provided by this modlue.
 *  
 */
module.exports = [

    { 
        key:'mpd.report', 
        permissions:'mpdreports.balancereports', 
        icon:'fa-area-chart', 
        controller:'MPDReport',
        label:'MPD Report',
        // context:'opsportal',
        isController:true, 
        options:{}, 
        version:'0' 
    }

];
