const express = require('express')
const ejs = require('ejs')
const Sequelize = require('sequelize')
const bodyParser = require('body-parser')
const PORT = process.env.PORT || 3000
const passport = require('passport')
const session = require('express-session')
const cookieParser = require('cookie-parser')
const LocalStrategy = require('passport-local').Strategy
const SequelizeStore = require('connect-session-sequelize')(session.Store)

const Op = Sequelize.Op
const plugs = require('./plugs.js')
const sequelize = new Sequelize(plugs.tableName, plugs.dialect, plugs.pw,{
   host: plugs.localhost,
   port: plugs.port,
   dialect: plugs.dialect,
   $and : Op.and,
   $or: Op.or,
   $eq: Op.eq,
   $like: Op.like
})

const User = sequelize.define('user', {
	username: Sequelize.STRING,
	password: Sequelize.STRING
})


const sessionStore = new SequelizeStore({
    db: sequelize
  });

sequelize.sync()
sessionStore.sync();

const app = express()


//===============Sessions========================
/*
In a typical web application, the credentials used to authenticate
  a user will only be transmitted during the login request.
  If authentication succeeds, a session will be established and
  maintained via a cookie set in the user's browser.

Each subsequent request will not contain credentials, but rather
 the unique cookie that identifies the session. In order to support
 login sessions, Passport will serialize and deserialize user
 instances to and from the session.
*/
//create cookie & with id and link cookie to user detail info

passport.serializeUser(function(user, done) {
		console.log("*********SerializeUser*********")
      //done(null, {id: user.id, user: user.username});
      done(null, user)
});
//convert id in cookie to user details
	passport.deserializeUser(function(obj,done){
		console.log("--deserializeUser--");
		console.log(obj)
			done(null, obj);
	})

//================Start Passport Local Config==================
//Passport Sign-up
passport.use('local-signup', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true
}, processSignupCallback));   // <<-- more on this to come

function processSignupCallback(req, username, password, done) {
    // first search to see if a user exists in our system with that email
    User.findOne({
        where: {
            'username' :  username
				}
    })
    .then((user)=> {
        if (user) {
            // user exists call done() passing null and false
            return done(null, false);
        } else {

// create the new user
			let newUser = req.body; // make this more secure
			User.create(newUser)
			.then((user)=>{
			    //once user is created call done with the created user
			   // createdRecord.password = undefined;
			   console.log("Yay!!! User created")
			   // console.log(user)
			    return done(null, user);
			})

		}
	})
}
//-------------End of Passport Sign-up-----------

//-------------Start of Passport Login-----------

	// Local Strategy
passport.use('local-login', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true
}, processLoginCallback));   // <<-- more on this to come

function processLoginCallback(req, username, password, done) {
    // first search to see if a user exists in our system with that email
    User.findOne({
        where: {
            'username' :  username
				},
    })
    .then((user)=> {
        if (!user) {
            // user exists call done() passing null and false
            return done(null, false);
        }else if(password !== user.password){
						return done(null, false)
					}else{
			   console.log("Yay!!! User is logged in")
			   // console.log(user)
			    return done(null, user);
			  }
		})

}


  app.use(require('morgan')('combined'));
	app.set('view engine', 'ejs')
	app.use(bodyParser.json())
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(express.static('public'))
	app.use(cookieParser());

	app.use(session({
		secret: 'keyboard cat',
		store: sessionStore,
		resave: false,
		saveUninitialized: false
	}));

//================ Passport Middleware ==============
/*
In an Express-based application, passport.initialize() middleware
is required to initialize Passport. If your application uses persistent
login sessions, passport.session() middleware must also be used.
*/
	app.use(passport.initialize());
  app.use(passport.session());



//=========Routes==================
app.get('/', (req, res)=>{
	if(req.user){
	res.render('homepage', {user: req.user})
	}else{
		res.redirect('/login')
	}
})

app.get('/register', (req, res)=>{
	return res.render('register')
})

app.post('/signup', function(req,res, next){
	passport.authenticate('local-signup', function(err, user){
		if (err) {
			return next(err);
		} else {
			return res.redirect('/login')
		}
	})(req, res, next);
//	})
});

app.post('/login', function(req,res,next){
		passport.authenticate('local-login', function(err, user){
			console.log("Another login for user  :" + req.user)
			if (err || user == false) {
				return res.render('login', {message: "Incorrect Username/Password"})
			} else {
				req.login(user, function(err){
					console.log("Getting req.user :"+ req.user)
					return res.render('homepage', {user: req.user})
				})
			}
		})(req, res, next);
})


app.get('/login', (req, res)=>{
	return res.render('login', {message: "Please login"})
})

app.get('/profile',
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res){
  	console.log("****The req.user****" + req.user)
  	User.findById(req.user.id).then((user)=>{
     res.render('profile', { user: user.dataValues});
    })
  })

app.get('/logout',function(req, res){
  	console.log("*****Loging out*****")
  	req.session.destroy()
    req.logout();
    res.redirect('/login');
  })

app.listen(PORT, ()=>{
	console.log("Bcrypt app server started...")
})
