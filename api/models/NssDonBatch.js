/**
 * NssCoreTerritory
 *
 * @module      :: Model
 * @description :: A short summary of how this model works and what it represents.
 *
 */

module.exports = {

  tableName:"nss_don_donBatch",
  autoCreatedAt:false,
  autoUpdatedAt:false,
  autoPK:false,
  migrate:'safe',


  adapter:"nss",



  attributes: {

  	/* e.g.
  	nickname: 'string'
  	*/
	donBatch_id: 'INTEGER',

	nssren_id: 'INTEGER',

	ren_id: 'INTEGER',

	donBatch_dateCreated: 'DATE',

	donBatch_dateProcessed: 'DATE',

	donBatch_nscName: 'STRING',

	nsc_territory_id: 'INTEGER',

	donBatch_amount: 'DOUBLE',

	donBatch_fee: 'DOUBLE',

	donBatch_status: 'STRING',

	glbatch_id: 'INTEGER',

	donBatch_look:  'INTEGER'
  }

};
