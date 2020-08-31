const nestedSets = schema => {
  // returns the parent node
  schema.method('parent', async function() {
    try {
      const self = this;
      const parent = await self.constructor.findOne({_id: self.parentId});
      console.log(`Getting parent for ${self._id}`);
      return parent;
    } catch (error) {
      console.log('Getting the parent for user failed', error);
    }
  });

  // returns all the ancestors plus self
  schema.method('ancestors', async function() {
    try {
      const self = this;
      const ancestors = await self.constructor.find({ lft: { $lte: self.lft, $gt: 0 }, rgt: { $gte: self.rgt }, deleted: false}).sort('lft');
      console.log(`Getting ancestors for ${self._id}`);
      return ancestors;
    } catch (error) {
      console.log('Getting the ancestors for user failed', error);
    }
  });

  // returns all the direct subordinates
  schema.method('subordinates', async function() {
    try {
      const self = this;
      const subordinates = await self.constructor.find({ parentId: self._id, deleted: false });
      console.log(`Getting subordinates for ${self._id}`);
      return subordinates;
    } catch (error) {
      console.log('Getting the subordinates for user failed', error);
    }
  });

  // returns the parent node
  schema.method('updateParentReports', async function(inc) {
    try {
      const self = this;
      await self.constructor.updateOne({ _id: self.parentId }, { $inc: { reports: inc } });
      console.log(`Updating parent reports by for ${self._id} by ${inc}`);
    } catch (error) {
      console.log(`Updating parent reports by ${inc} failed`, error);
    }
  });

  // returns the parent node
  schema.method('updateChildren', async function(children, inc) {
    try {
      const self = this;
      await Promise.all(children.map(async (child) => {
        await self.constructor.updateOne({ _id: child._id }, { $inc: { lft: inc }});
        await self.constructor.updateOne({ _id: child._id }, { $inc: { rgt: inc }});
      }));
      console.log(`Updating children left and right values by ${inc}`);
    } catch (error) {
      console.log(`Updating parent reports by ${inc} failed`, error);
    }
  });


  // pre hook for save
  schema.pre('save', async function() {
    try {
      const self = this;
      if(self.parentId) {
        const parentNode = await self.parent();
        if (parentNode && parentNode.lft && parentNode.rgt) {
          // update left and right values for all nodes
          const selfLft = parentNode.rgt;
          await self.constructor.updateMany({ lft: { $gte: selfLft } }, { $inc: { lft: 2 } });
          await self.constructor.updateMany({ rgt: { $gte: selfLft } }, { $inc: { rgt: 2 } });
          await self.updateParentReports(1);
          self.lft = selfLft;
          self.rgt = selfLft + 1;
        }
      }
    } catch (error) {
      console.log('Saving the user with parent failed', error);
    }
  });

  // method to soft delete a user
  schema.method('softDelete', async function() {
    try {
      const self = this;
      const selfLft = self.lft;
      const selfRgt = self.rgt;
      // update for deleted node's children
      await self.constructor.updateMany({ lft: { $gt: selfLft, $lt: selfRgt } }, { $inc: { lft: -1 } });
      await self.constructor.updateMany({ rgt: { $gt: selfLft, $lt: selfRgt } }, { $inc: { rgt: -1 } });
      await self.constructor.updateMany({ lft: { $gt: selfRgt } }, { $inc: { lft: -2 } });
      await self.constructor.updateMany({ rgt: { $gt: selfRgt } }, { $inc: { rgt: -2 } });
      await self.constructor.updateOne({ _id: self._id }, { lft: 0, rgt: 0, deleted: true, reports: 0 });
      // Update direct subordinate count for parent
      if (self.parentId) {
        const parentNode = await self.parent();
        if (parentNode) {
          // update direct subordinate parent
          await self.constructor.updateMany({ parentId: self._id }, { $set: { parentId: self.parentId } });
          // add direct subordinate count to the parent - self count
          await self.updateParentReports(self.reports - 1);
        }
      }
      return await self.constructor.findOne({_id: self._id});
    } catch (error) {
      console.log('Soft deleting the user failed', error);
    }
  });

  // method to update a user when parents are changed
  schema.method('parentUpdate', async function(update) {
    try {
      const self = this;
      // if we want to move children with the manager
      const movingUsers = Math.ceil((self.rgt - self.lft)/2);
      const allChildren = await self.constructor.find({lft: {$gt: self.lft, $lt: self.rgt}});
      await self.constructor.updateOne({_id: self._id}, {$set: update});
      const parentNode = await self.constructor.findOne({_id: update.parentId});
      if (parentNode && parentNode.lft && parentNode.rgt) {
        // if the new parent is ahead in hierarchy
        if (parentNode.rgt > self.rgt) {
          const newLft = parentNode.rgt - 2 * movingUsers;
          const diff = newLft - self.lft;
          const newRgt = self.rgt + diff;
          // update nodes between self and parent node
          await self.constructor.updateMany({lft: {$gt: self.rgt, $lt: parentNode.rgt}}, {$inc: {lft: -(2 * movingUsers)}});
          await self.constructor.updateMany({rgt: {$gt: self.rgt, $lt: parentNode.rgt}}, {$inc: {rgt: -(2 * movingUsers)}});
          // now update the children with correct value
          await self.updateChildren(allChildren, diff);
          // changing the older parent and new parent direct reports
          await self.constructor.updateOne({_id: update.parentId}, {$inc: {reports: 1}});
          await self.constructor.updateOne({_id: self.parentId}, {$inc: {reports: -1}});
          // updating self data
          return await self.constructor.findOneAndUpdate({_id: self._id}, {$set: {lft: newLft, rgt: newRgt}}, {useFindAndModify: false, new: true});
        } else {
          const selfLft = self.lft;
          const newLft = parentNode.rgt;
          const diff = self.lft - newLft;
          const newRgt = self.rgt - diff;
          // update nodes between self and parent node
          await self.constructor.updateMany({lft: {$gt: parentNode.rgt, $lt: selfLft}}, {$inc: {lft: 2 * movingUsers}});
          await self.constructor.updateMany({rgt: {$gte: parentNode.rgt, $lt: selfLft}}, {$inc: {rgt: 2 * movingUsers}});
          // now update the children with correct value
          await self.updateChildren(allChildren, -diff);
          // changing the older parent and new parent direct reports
          await self.constructor.updateOne({_id: update.parentId}, {$inc: {reports: 1}});
          await self.constructor.updateOne({_id: self.parentId}, {$inc: {reports: -1}});
          // updating self data
          return await self.constructor.findOneAndUpdate({_id: self._id}, {$set: {lft: newLft, rgt: newRgt}}, {useFindAndModify: false, new: true});
        }
      }
      // if we want to just move the user and not children
      // await self.constructor.updateOne({_id: self._id}, {$set: update});
      // await self.softDelete();
      // const parentNode = await self.constructor.findOne({ _id: update.parentId });
      // if (parentNode && parentNode.lft && parentNode.rgt) {
      //   const selfLft = parentNode.rgt;
      //   await self.constructor.updateMany({lft: {$gte: selfLft}}, {$inc: {lft: 2}});
      //   await self.constructor.updateMany({rgt: {$gte: selfLft}}, {$inc: {rgt: 2}});
      //   await self.constructor.updateOne({ _id: self.parentId }, {$inc: {reports: 1}});
      //   await self.constructor.updateOne({_id: self._id}, {$set: {lft: selfLft, rgt: selfLft + 1}});
      // }
    } catch (error) {
      console.log('Updating the user when parents are changed failed', error);
    }
  });
};

export default nestedSets;
