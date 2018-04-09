const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');

exports.loginForm = (req, res) =>{
  res.render('login', {title: 'Login Form'})
}

exports.registerForm = (req, res) => {
  res.render('register', {title: 'Register Form'})
}

exports.validateRegister = (req, res, next) => {
  // sanitizeBody is a method in expressValidator take quick look on it
  req.sanitizeBody('name')
  req.checkBody('name', 'You must input a name!').notEmpty();
  req.checkBody('email', 'Your Email input is not valid!').isEmail();
  req.sanitizeBody('email').normalizeEmail({
    remove_dots: false,
    remove_extension: false,
    gmail_remove_subaddress: false
  })
  req.checkBody('password', 'Pssword can\'t be Blank!').notEmpty();
  req.checkBody('confirm-password', 'Confirm-password can\'t be Blank!').notEmpty();
  req.checkBody('confirm-password', 'Oooops! Your passwords didn\'t match').equals(req.body.password);

  const errors = req.validationErrors();
  if(errors) {
    req.flash('error', errors.map(err => err.msg));
    res.render('register', {title: 'Register', body: req.body, flashes: req.flash() })
    return; // stop the function from running coz there is an error
  }
  next(); // continue coz there is no error
}

exports.register = async (req, res, next) => {
  const user = new User({ email: req.body.email, name: req.body.name });
  const register = promisify(User.register, User);
  await register(user, req.body.password);
  next();
}

exports.account = (req, res) =>{
  res.render('account', {title: 'Edit Your Account'});
}

exports.updateAccount = async (req, res) => {
  const updates = {
    name: req.body.name,
    email: req.body.email
  };

  const user = await User.findOneAndUpdate(
    {_id: req.user._id},
    {$set: updates},
    {new: true, runValidators: true, context: 'query'}

  );
  req.flash('sucess', 'Your Profile! is successfully Updated!!');
  res.redirect('back')
}
