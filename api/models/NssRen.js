/**
 * NssRen
 *
 * @module      :: Model
 * @description :: A short summary of how this model works and what it represents.
 *
 */

module.exports = {

  tableName:"nss_core_ren",
  autoCreatedAt:false,
  autoUpdatedAt:false,
  autoPK:false,
  migrate:'safe',

  adapter:"nss",



  attributes: {

  	/* e.g.
  	nickname: 'string'
  	*/

    nssren_id	: 'INTEGER',


    ren_id	: 'INTEGER',


    nssren_salaryAmount	: 'FLOAT',


    nssren_salaryCap	: 'FLOAT',


    nssren_additionalCap	: 'FLOAT',


    nssren_nscID	: 'INTEGER',


    nssren_per1	: 'FLOAT',


    nssren_per2	: 'FLOAT',


    nssren_per3	: 'FLOAT',


    nssren_per4	: 'FLOAT',


    nssren_per5	: 'FLOAT',


    nssren_per6	: 'FLOAT',


    nssren_per7	: 'FLOAT',


    nssren_per8	: 'FLOAT',


    nssren_per9	: 'FLOAT',


    nssren_per10	: 'FLOAT',


    nssren_per11	: 'FLOAT',


    nssren_per12	: 'FLOAT',


    nssren_isActive	: 'INTEGER',


    nssren_ytdBaseSalary	: 'FLOAT',


    nssren_ytdCode7000Additional	: 'FLOAT',


    nssren_ytdCode7000Deductions	: 'FLOAT',


    nssren_ytdBalance	: 'FLOAT',


    nssren_balancePeriod	: 'STRING',


    territory_id	: 'INTEGER',


    nssren_monthsdonations	: 'FLOAT',


    nssren_emailNotifications	: 'INTEGER',


    nssren_lastBalanceUpdate	: 'DATE',


    nssren_advancesAllowed	: 'INTEGER',


    nssren_13MonthReportDate	: 'DATE',


    nssren_mergeDate	: 'DATE',


    ren_guid	: 'TEXT'
  }

};
