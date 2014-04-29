/**
 * Adapter config
 *
 * The `adapters` configuration object lets you create different global "saved settings"
 * that you can mix and match in your models.  The `default` option indicates which
 * "saved setting" should be used if a model doesn't have an adapter specified.
 *
 * Keep in mind that options you define directly in your model definitions
 * will override these settings.
 *
 * For more information on adapter configuration, check out:
 * http://sailsjs.org/#documentation
 */

module.exports = {

/*
  mysql: {
    module: 'sails-mysql',
    host: 'YOUR_MYSQL_SERVER_HOSTNAME_OR_IP_ADDRESS',
    user: 'YOUR_MYSQL_USER',
    password: 'YOUR_MYSQL_PASSWORD',
    database: 'YOUR_MYSQL_DB'
  }
*/

  // The connection settings to connect to HRiS data.
  hris: {
    module: 'sails-mysql',
	host: '....',
	port: '....',
    user: '....',
    // Psst.. You can put your password in config/local.js instead
    // so you don't inadvertently push it up if you're using version control
    password: '....',
    database: '....'
  },

  // The connection settings to connect with the NSS data
  nss: {
    module: 'sails-mysql',
	host: '....',
	port: '....',
    user: '....',
    // Psst.. You can put your password in config/local.js instead
    // so you don't inadvertently push it up if you're using version control
    password: '....',
    database: '....'
  },


  // The connection settings to connect with the hrdb data
  hrdb: {
    module: 'sails-mysql',
	host: '....',
	port: '....',
    user: '....',
    // Psst.. You can put your password in config/local.js instead
    // so you don't inadvertently push it up if you're using version control
    password: '....',
    database: '....'
  }

};