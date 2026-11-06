// Unit and HTTP smoke tests never connect to the configured user database.
process.env.NODE_ENV="test";
process.env.MONGODB_URI="mongodb://127.0.0.1:27017/questrealm_test";
process.env.WEB_ORIGIN="http://localhost:5173";
