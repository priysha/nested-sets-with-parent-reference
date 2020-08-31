import mongoose from 'mongoose'
import userSchema from '../../../src/models/userModel'
import { addUser, getUser, updateUser, deleteUser } from '../../../src/controllers/userControllers'

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res
};

const mockRequest = (reqBody, reqQuery) => {
  return {
    body: reqBody,
    query: reqQuery
  }
};

describe('user controller set', () => {
  let collection;
  let User;

  beforeAll(async () => {
    collection = await mongoose.connect('mongodb://localhost/profiles_test_controller', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    User = mongoose.model('User', userSchema)
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await collection.close()
  });

  describe('addUser', () => {
    test('should 400 if no req.body is sent', async () => {
      const req = mockRequest({});
      const res = mockResponse();
      await addUser(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalled()
    });

    test('should create user if data is sent in req.body', async () => {
      const req = mockRequest({
        name: 'David',
        emailId: 'david@dundermifflin',
        designation: 'CEO',
        lft: 1,
        rgt: 2
      });
      const res = mockResponse();
      await addUser(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const david = await User.findOne({ name: 'David' });
      expect(david.name).toEqual('David');
      const mockReq = mockRequest({}, { _id: david._id });
      await deleteUser(mockReq, res)
    })
  });

  describe('getUser', () => {
    beforeEach(async () => {
      const addReq = mockRequest({
        name: 'David',
        emailId: 'david@dundermifflin',
        designation: 'CEO',
        lft: 1,
        rgt: 2
      });
      const addRes = mockResponse();
      await addUser(addReq, addRes);
    });

    afterEach(async () => {
      const david = await User.findOne({ name: 'David' });
      const deleteReq = mockRequest({}, { _id: david._id });
      const deleteRes = mockResponse();
      await deleteUser(deleteReq, deleteRes);
    });

    test('should return 200 with all non-deleted users data if no req.query is sent', async () => {
      const david = await User.findOne({ name: 'David' });
      const softDelRes = mockResponse();
      const softDelReq = mockRequest({ deleted: true }, { _id: david._id });
      await updateUser(softDelReq, softDelRes);
      const req = mockRequest({}, {});
      const res = mockResponse();
      await getUser(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    test('should return 200 with all users data if no req.query is sent', async () => {
      const david = await User.findOne({ name: 'David' });
      const softDelRes = mockResponse();
      const softDelReq = mockRequest({ deleted: true }, { _id: david._id });
      await updateUser(softDelReq, softDelRes);
      const users = await User.find();
      const req = mockRequest({}, { all: true });
      const res = mockResponse();
      await getUser(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(users);
    });

    test('should return 200 with specific user data if no req.query contains the name', async () => {
      const req = mockRequest({}, { name: 'David' });
      const res = mockResponse();
      await getUser(req, res);
      const david = await User.findOne({ name: 'David' });
      const ancestors = await david.ancestors();
      const subordinates = await david.subordinates();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: david,
        ancestors,
        subordinates
      });
    });

    test('should return 400 if no such user exists', async () => {
      const req = mockRequest({}, { name: 'Temp' });
      const res = mockResponse();
      await getUser(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    })
  });

  describe('updateUser', () => {
    beforeEach(async () => {
      const addReq = mockRequest({
        name: 'David',
        emailId: 'david@dundermifflin',
        designation: 'CEO',
        lft: 1,
        rgt: 2
      });
      const addRes = mockResponse();
      await addUser(addReq, addRes)
    });

    afterEach(async () => {
      const david = await User.findOne({ name: 'David' });
      const deleteReq = mockRequest({}, { _id: david._id });
      const deleteRes = mockResponse();
      await deleteUser(deleteReq, deleteRes)
    });

    test('should return 400 if no req.query or req.body sent', async () => {
      const req = mockRequest({}, {});
      const res = mockResponse();
      await updateUser(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalled()
    });

    test('should return 200 and soft delete a user if deleted: true is sent in body', async () => {
      let david = await User.findOne({ name: 'David' });
      const res = mockResponse();
      const req = mockRequest({ deleted: true }, { _id: david._id });
      await updateUser(req, res);
      david = await User.findOne({ name: 'David' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(david)
    });

    test('should return 200 and update user parents if parent id is sent in the body', async () => {
      const david = await User.findOne({ name: 'David' });
      const add1Req = mockRequest({
        name: 'Jan',
        emailId: 'Jan@dundermifflin',
        designation: 'VP',
        parentId: david._id
      });
      const add1Res = mockResponse();
      await addUser(add1Req, add1Res);
      const jan = await User.findOne({ name: 'Jan' });
      const add2Req = mockRequest({
        name: 'Michael',
        emailId: 'Michael@dundermifflin',
        designation: 'Director',
        parentId: jan._id
      });
      const add2Res = mockResponse();
      await addUser(add2Req, add2Res);
      let michael = await User.findOne({ name: 'Michael' });
      const res = mockResponse();
      const req = mockRequest({ parentId: david._id }, { _id: michael._id });
      await updateUser(req, res);
      michael = await User.findOne({ name: 'Michael' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(michael)
    });

    test('should return 200 and update user for personal data update', async () => {
      let david = await User.findOne({ name: 'David' });
      const res = mockResponse();
      const req = mockRequest({ joiningDate: '2018-02-02' }, { _id: david._id });
      await updateUser(req, res);
      david = await User.findOne({ name: 'David' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(david)
    })
  });

  describe('deleteUser', () => {
    test('should 400 if no req.query is sent', async () => {
      const req = mockRequest({}, {});
      const res = mockResponse();
      await deleteUser(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalled()
    });

    test('should hard delete user if id is sent in req.query', async () => {
      const req = mockRequest({
        name: 'David',
        emailId: 'david@dundermifflin',
        designation: 'CEO',
        lft: 1,
        rgt: 2
      });
      const res = mockResponse();
      await addUser(req, res);
      const david = await User.findOne({ name: 'David' });
      const mockReq = mockRequest({}, { _id: david._id });
      await deleteUser(mockReq, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const getReq = mockRequest({}, { name: 'David' });
      const getRes = mockResponse();
      await getUser(getReq, getRes);
      expect(getRes.status).toHaveBeenCalledWith(400)
    })
  })
});
