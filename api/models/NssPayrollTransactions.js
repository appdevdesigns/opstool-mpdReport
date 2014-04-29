/**
 * NssCoreTerritory
 *
 * @module      :: Model
 * @description :: A short summary of how this model works and what it represents.
 *
 */

module.exports = {

  tableName:"nss_payroll_transactions",
  autoCreatedAt:false,
  autoUpdatedAt:false,
  autoPK:false,
  migrate:'safe',


  adapter:"nss",




  attributes: {

  	/* e.g.
  	nickname: 'string'
  	*/

    nsstransaction_id: 'INTEGER',

    nssren_id: 'INTEGER',

	nsstransaction_baseSalary: 'DOUBLE',

	nsstransaction_allowance: 'DOUBLE',

	nsstransaction_deduction: 'DOUBLE',

	nsstransaction_totalSalary: 'DOUBLE',

	nsstransaction_date: 'DATE',

	requestcutoff_id: 'INTEGER',

	nsstransaction_processedBy: 'STRING',

	nsstransaction_territory_id: 'INTEGER',

	glbatch_id: 'INTEGER'

  }

};
