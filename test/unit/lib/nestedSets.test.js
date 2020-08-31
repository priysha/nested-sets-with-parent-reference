import mongoose from 'mongoose'
import userSchema from '../../../src/models/userModel';

describe('nested sets test', () => {
  let collection;
  let User;
  let david, jan, michael, jim, dwight, phyllis, angela, pam;

  beforeAll(async () => {
    collection = await mongoose.connect('mongodb://localhost/profiles_test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    User = mongoose.model('User', userSchema);
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await collection.close();
  });

  beforeEach(async () => {
    david = new User({name: 'David', emailId: 'david@dundermifflin', designation: 'CEO', lft: 1, rgt: 2});
    // david lft:1, rgt: 2
    await david.save();
    jan = new User({name: 'Jan', emailId: 'jan@dundermifflin', designation: 'VP', parentId: david._id});
    await jan.save();
    // david lft:1, rgt: 4, jan lft:2, rgt: 3
    michael = new User({name: 'Michael', emailId: 'Michael@dundermifflin', designation: 'Director', parentId: jan._id});
    await michael.save();
    // david lft:1, rgt: 6, jan lft:2, rgt: 5, michael lft:3, rgt: 4
    jim = new User({name: 'Jim', emailId: 'Jim@dundermifflin', designation: 'Manager', parentId: michael._id});
    await jim.save();
    // david lft:1, rgt: 8, jan lft:2, rgt: 7, michael lft:3, rgt: 6, jim lft:4, rgt: 5
    dwight = new User({name: 'Dwight', emailId: 'Dwight@dundermifflin', designation: 'Manager', parentId: michael._id});
    await dwight.save();
    // david lft:1, rgt: 10, jan lft:2, rgt: 9, michael lft:3, rgt: 8, jim lft:4, rgt: 5, dwight lft:6, rgt: 7
    phyllis = new User({name: 'Phyllis', emailId: 'Phyllis@dundermifflin', designation: 'FTE', parentId: jim._id});
    await phyllis.save();
    // david lft:1, rgt: 12, jan lft:2, rgt: 11, michael lft:3, rgt: 10, jim lft:4, rgt: 7,
    // phyllis lft:5, rgt: 6, dwight lft:8, rgt: 9
    angela = new User({name: 'Angela', emailId: 'Angela@dundermifflin', designation: 'FTE', parentId: dwight._id});
    await angela.save();
    // david lft:1, rgt: 14, jan lft:2, rgt: 13, michael lft:3, rgt: 12, jim lft:4, rgt: 7,
    // phyllis lft:5, rgt: 6, dwight lft:8, rgt: 11,  dwight lft:9, rgt: 10
    pam = new User({name: 'Pam', emailId: 'Pam@dundermifflin', designation: 'Contractor', parentId: angela._id});
    await pam.save();
    // david lft:1, rgt: 16, jan lft:2, rgt: 15, michael lft:3, rgt: 14, jim lft:4, rgt: 7,
    // phyllis lft:5, rgt: 6, dwight lft:8, rgt: 13,  angela lft:9, rgt: 12,  pam lft:10, rgt: 11
  });

  afterEach(async () => {
    await david.remove();
    await jan.remove();
    await michael.remove();
    await jim.remove();
    await dwight.remove();
    await phyllis.remove();
    await angela.remove();
    await pam.remove();

  });

  test('should add user to the db with correct parent', async () => {
    const davidUser = await User.findOne({name: 'David'});
    expect(davidUser.name).toEqual('David');
    expect(davidUser.designation).toEqual('CEO');
    expect(davidUser.reports).toEqual(1);
    const janUser = await User.findOne({name: 'Jan'});
    expect(janUser.name).toEqual('Jan');
    expect(janUser.parentId).toEqual(davidUser._id);
    expect(janUser.lft).toEqual(davidUser.lft + 1);
  });

  test('should get correct ancestors', async () => {
    const davidUser = await User.findOne({name: 'David'});
    const davidAncestors = await davidUser.ancestors();
    // only David himself will be returned in the ancestors
    expect(davidAncestors.length).toEqual(1);
  });

  test('should get correct subordinates', async () => {
    const davidUser = await User.findOne({name: 'David'});
    const davidSubordinates = await davidUser.subordinates();
    // only Jan will be returned in the ancestors
    expect(davidSubordinates.length).toEqual(1);
    expect(davidSubordinates[0].name).toEqual('Jan');
  });

  test('should increment parent reports correctly', async () => {
    const pamUser = await User.findOne({name: 'Pam'});
    await pamUser.updateParentReports(3);
    const angelaUser = await User.findOne({name: 'Angela'});
    // Angela direct reports increased from 1 to 4
    expect(angelaUser.reports).toEqual(4);
  });

  test('should increment children left and right correctly', async () => {
    let davidUser = await User.findOne({name: 'David'});
    let janUser = await User.findOne({name: 'Jan'});
    let michaelUser = await User.findOne({name: 'Michael'});
    let jimUser = await User.findOne({name: 'Jim'});
    let dwightUser = await User.findOne({name: 'Dwight'});
    let phyllisUser = await User.findOne({name: 'Phyllis'});
    let angelaUser = await User.findOne({name: 'Angela'});
    let pamUser = await User.findOne({name: 'Pam'});
    expect(davidUser.lft).toEqual(1);
    expect(davidUser.rgt).toEqual(16);
    expect(janUser.lft).toEqual(2);
    expect(janUser.rgt).toEqual(15);
    expect(michaelUser.lft).toEqual(3);
    expect(michaelUser.rgt).toEqual(14);
    expect(jimUser.lft).toEqual(4);
    expect(jimUser.rgt).toEqual(7);
    expect(phyllisUser.lft).toEqual(5);
    expect(phyllisUser.rgt).toEqual(6);
    expect(dwightUser.lft).toEqual(8);
    expect(dwightUser.rgt).toEqual(13);
    expect(angelaUser.lft).toEqual(9);
    expect(angelaUser.rgt).toEqual(12);
    expect(pamUser.lft).toEqual(10);
    expect(pamUser.rgt).toEqual(11);

    const davidChildren = await User.find({lft: {$gt: davidUser.lft, $lt: davidUser.rgt}});
    await davidUser.updateChildren(davidChildren, 2);
    janUser = await User.findOne({name: 'Jan'});
    michaelUser = await User.findOne({name: 'Michael'});
    jimUser = await User.findOne({name: 'Jim'});
    dwightUser = await User.findOne({name: 'Dwight'});
    phyllisUser = await User.findOne({name: 'Phyllis'});
    angelaUser = await User.findOne({name: 'Angela'});
    pamUser = await User.findOne({name: 'Pam'});
    expect(davidUser.lft).toEqual(1);
    expect(davidUser.rgt).toEqual(16);
    expect(janUser.lft).toEqual(4);
    expect(janUser.rgt).toEqual(17);
    expect(michaelUser.lft).toEqual(5);
    expect(michaelUser.rgt).toEqual(16);
    expect(jimUser.lft).toEqual(6);
    expect(jimUser.rgt).toEqual(9);
    expect(phyllisUser.lft).toEqual(7);
    expect(phyllisUser.rgt).toEqual(8);
    expect(dwightUser.lft).toEqual(10);
    expect(dwightUser.rgt).toEqual(15);
    expect(angelaUser.lft).toEqual(11);
    expect(angelaUser.rgt).toEqual(14);
    expect(pamUser.lft).toEqual(12);
    expect(pamUser.rgt).toEqual(13);
  });

  test('should update user to the correct parent without children', async () => {
    let pamUser = await User.findOne({name: 'Pam'});
    let dwightUser = await User.findOne({name: 'Dwight'});
    expect(dwightUser.lft).toEqual(8);
    expect(dwightUser.rgt).toEqual(13);
    expect(pamUser.lft).toEqual(10);
    expect(pamUser.rgt).toEqual(11);

    await pamUser.parentUpdate({parentId: dwightUser._id}, function(callback){});
    pamUser = await User.findOne({name: 'Pam'});
    dwightUser = await User.findOne({name: 'Dwight'});
    expect(pamUser.parentId).toEqual(dwightUser._id);
    expect(dwightUser.lft).toEqual(8);
    expect(dwightUser.rgt).toEqual(13);
    expect(pamUser.lft).toEqual(11);
    expect(pamUser.rgt).toEqual(12);
  });

  test('should update user to the correct parent with children', async () => {
    let jimUser = await User.findOne({name: 'Jim'});
    let michaelUser = await User.findOne({name: 'Michael'});
    let phyllisUser = await User.findOne({name: 'Phyllis'});
    let janUser = await User.findOne({name: 'Jan'});
    // Jim has Phyllis as direct report
    expect(jimUser.reports).toEqual(1);
    // Phyllis reports to Jim
    expect(phyllisUser.parentId).toEqual(jimUser._id);
    // Jim reports to Michael
    expect(jimUser.parentId).toEqual(michaelUser._id);
    expect(janUser.lft).toEqual(2);
    expect(janUser.rgt).toEqual(15);
    expect(michaelUser.lft).toEqual(3);
    expect(michaelUser.rgt).toEqual(14);
    expect(jimUser.lft).toEqual(4);
    expect(jimUser.rgt).toEqual(7);
    expect(phyllisUser.lft).toEqual(5);
    expect(phyllisUser.rgt).toEqual(6);

    //moving Jim under Jan, order should be maintained
    await jimUser.parentUpdate({parentId: janUser._id}, function(){});
    jimUser = await User.findOne({name: 'Jim'});
    michaelUser = await User.findOne({name: 'Michael'});
    phyllisUser = await User.findOne({name: 'Phyllis'});
    janUser = await User.findOne({name: 'Jan'});
    expect(jimUser.parentId).toEqual(janUser._id);
    expect(janUser.lft).toEqual(2);
    expect(janUser.rgt).toEqual(15);
    expect(michaelUser.lft).toEqual(3);
    expect(michaelUser.rgt).toEqual(10);
    expect(jimUser.lft).toEqual(11);
    expect(jimUser.rgt).toEqual(14);
    expect(phyllisUser.lft).toEqual(12);
    expect(phyllisUser.rgt).toEqual(13);
  });

  test('should add a new user and maintain the order', async () => {
    let jimUser = await User.findOne({name: 'Jim'});
    let phyllisUser = await User.findOne({name: 'Phyllis'});
    // Jim has Phyllis as direct report
    expect(jimUser.reports).toEqual(1);
    // Phyllis reports to Jim
    expect(phyllisUser.parentId).toEqual(jimUser._id);
    // Phyllis has no direct reports
    expect(phyllisUser.reports).toEqual(0);
    expect(jimUser.lft).toEqual(4);
    expect(jimUser.rgt).toEqual(7);
    expect(phyllisUser.lft).toEqual(5);
    expect(phyllisUser.rgt).toEqual(6);

    //adding Ryan as a Contractor under Phyllis
    let ryan = new User({name: 'Ryan', emailId: 'Ryan@dundermifflin', designation: 'Contractor', parentId: phyllisUser._id});
    await ryan.save();
    jimUser = await User.findOne({name: 'Jim'});
    phyllisUser = await User.findOne({name: 'Phyllis'});
    ryan =  await User.findOne({name: 'Ryan'});
    expect(ryan.parentId).toEqual(phyllisUser._id);
    expect(phyllisUser.reports).toEqual(1);
    expect(jimUser.lft).toEqual(4);
    expect(jimUser.rgt).toEqual(9);
    expect(phyllisUser.lft).toEqual(5);
    expect(phyllisUser.rgt).toEqual(8);
    expect(ryan.lft).toEqual(6);
    expect(ryan.rgt).toEqual(7);
    await ryan.remove();
  });

  test('should soft delete a user by marking deleted true', async () => {
    let michaelUser = await User.findOne({name: 'Michael'});
    // Michael has Jim and Dwight as direct reports
    expect(michaelUser.reports).toEqual(2);
    expect(michaelUser.lft).toEqual(3);
    expect(michaelUser.rgt).toEqual(14);
    expect(michaelUser.deleted).toBeFalsy();

    //removing dwightUser from the hierarchy
    await michaelUser.softDelete();
    michaelUser = await User.findOne({name: 'Michael'});
    expect(michaelUser.reports).toEqual(0);
    expect(michaelUser.lft).toEqual(0);
    expect(michaelUser.rgt).toEqual(0);
    expect(michaelUser.deleted).toBeTruthy();
  });

  test('should soft delete a leaf user and maintain the order', async () => {
    let jimUser = await User.findOne({name: 'Jim'});
    let phyllisUser = await User.findOne({name: 'Phyllis'});
    // Jim has Phyllis as direct report
    expect(jimUser.reports).toEqual(1);
    // Phyllis reports to Jim
    expect(phyllisUser.parentId).toEqual(jimUser._id);
    // Phyllis has no direct reports
    expect(phyllisUser.reports).toEqual(0);
    expect(jimUser.lft).toEqual(4);
    expect(jimUser.rgt).toEqual(7);
    expect(phyllisUser.lft).toEqual(5);
    expect(phyllisUser.rgt).toEqual(6);

    //removing Phyllis from the hierarchy
    await phyllisUser.softDelete();
    jimUser = await User.findOne({name: 'Jim'});
    const michaelUser = await User.findOne({name: 'Michael'});
    expect(jimUser.reports).toEqual(0);
    expect(jimUser.lft).toEqual(4);
    expect(jimUser.rgt).toEqual(5);
    expect(michaelUser.lft).toEqual(3);
    expect(michaelUser.rgt).toEqual(12);
  });

  test('should soft delete a user with parents and maintain the order', async () => {
    let michaelUser = await User.findOne({name: 'Michael'});
    let dwightUser = await User.findOne({name: 'Dwight'});
    let angelaUser = await User.findOne({name: 'Angela'});
    let pamUser = await User.findOne({name: 'Pam'});
    // Michael has Jim and Dwight as direct reports
    expect(michaelUser.reports).toEqual(2);
    // Dwight has Angela as direct report
    expect(dwightUser.reports).toEqual(1);
    // Angela has Pam as direct report
    expect(angelaUser.reports).toEqual(1);
    expect(michaelUser.lft).toEqual(3);
    expect(michaelUser.rgt).toEqual(14);
    expect(dwightUser.lft).toEqual(8);
    expect(dwightUser.rgt).toEqual(13);
    expect(angelaUser.lft).toEqual(9);
    expect(angelaUser.rgt).toEqual(12);
    expect(pamUser.lft).toEqual(10);
    expect(pamUser.rgt).toEqual(11);

    //removing dwightUser from the hierarchy
    await dwightUser.softDelete();
    michaelUser = await User.findOne({name: 'Michael'});
    angelaUser = await User.findOne({name: 'Angela'});
    pamUser = await User.findOne({name: 'Pam'});
    // Michael now has Jim and Angela as direct reports
    expect(michaelUser.reports).toEqual(2);
    // Angela has Pam as direct report
    expect(angelaUser.reports).toEqual(1);
    expect(michaelUser.lft).toEqual(3);
    expect(michaelUser.rgt).toEqual(12);
    expect(angelaUser.lft).toEqual(8);
    expect(angelaUser.rgt).toEqual(11);
    expect(pamUser.lft).toEqual(9);
    expect(pamUser.rgt).toEqual(10);
  });

});
