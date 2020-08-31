import { addUser, getUser, updateUser, deleteUser } from '../controllers/userControllers'

const userRoutes = app => {
  app
    .route('/users')
    .post(addUser)
    .get(getUser)
    .put(updateUser)
    .delete(deleteUser)
};
export default userRoutes
