/**
 * Connections
 * (sails.config.connections)
 *
 * `Connections` are like "saved settings" for your adapters.  What's the difference between
 * a connection and an adapter, you might ask?  An adapter (e.g. `sails-mysql`) is generic--
 * it needs some additional information to work (e.g. your database host, password, user, etc.)
 * A `connection` is that additional information.
 *
 * Each model must have a `connection` property (a string) which is references the name of one
 * of these connections.  If it doesn't, the default `connection` configured in `config/models.js`
 * will be applied.  Of course, a connection can (and usually is) shared by multiple models.
 * .
 * Note: If you're using version control, you should put your passwords/api keys
 * in `config/local.js`, environment variables, or use another strategy.
 * (this is to prevent you inadvertently sensitive credentials up to your repository.)
 *
 * For more information on configuration, check out:
 * http://links.sailsjs.org/docs/config/connections
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
        adapter: 'sails-mysql',
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
        adapter: 'sails-mysql',
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
        adapter: 'sails-mysql',
        host: '....',
        port: '....',
        user: '....',
        // Psst.. You can put your password in config/local.js instead
        // so you don't inadvertently push it up if you're using version control
        password: '....',
        database: '....'
    }

};
