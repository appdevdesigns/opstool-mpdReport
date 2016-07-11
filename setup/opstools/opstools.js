/**
 * This file specifies any default Ops Portal Tool Definitions 
 * provided by this modlue.
 *  
 */
module.exports = [

    { 
        key:'mpd.report', 
        permissions:'mpdreports.balancereports, adcore.developer', 
        icon:'fa-area-chart', 
        controller:'MPDReport',
        label:'mpd.toolMPDReport',
        context:'opsportal',
        isController:true, 
        options:{}, 
        version:'0' 
    }

];
