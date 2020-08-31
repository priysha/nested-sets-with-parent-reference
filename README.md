# NodeJS Nested Sets with Parent Reference

This is a NodeJS service using MongoDB to create an org hierarchy using nested-set model with parent reference

Reference: http://mikehillyer.com/articles/managing-hierarchical-data-in-mysql/
https://docs.mongodb.com/manual/tutorial/model-tree-structures-with-nested-sets/
https://docs.mongodb.com/manual/tutorial/model-tree-structures-with-parent-references/

## How to run

Run the following commands:
```
npm init
npm install express
npm install http
npm install mongoose
npm install body-parser
npm install --save-dev @babel/core @babel/cli @babel/preset-env @babel/node
Then run node src/index.js
```

Navigate to [http://localhost:8080/users](http://localhost:8080/users), you should be able to get the list of all users

## CURL command GET
For all users who are not soft deleted:
```
curl --location --request GET 'http://localhost:8080/users'
```

For a specific user:
```
curl --location --request GET 'http://localhost:8080/users?name=David'
```

For all users including soft-deleted:
```
curl --location --request GET 'http://localhost:8080/users?all=true'
```

## CURL command POST

For first entry:
```
curl --location --request POST 'http://localhost:8080/users' \
--header 'Content-Type: application/json' \
--data-raw '{
    "name": "David",
    "designation": "CEO",
    "emailId": "David@dundermifflin.com",
    "lft": 1,
    "rgt": 2
}'
```
Only for first user, you need to pass 'lft' and 'rgt'

For others, you need to pass the id of parent

```
curl --location --request POST 'http://localhost:8080/users' \
--header 'Content-Type: application/json' \
--data-raw '{
    "name": "Jan",
    "designation": "VP",
    "emailId": "Jan@dundermifflin.com",
    "parentId": "{add parent ID here}"
}
'
```

## CURL command PUT

To update a user's personal info:
```
curl --location --request PUT 'http://localhost:8080/users?_id={add user id here}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "joiningDate": "2010-08-22"
}'
```

To soft-delete a user:
```
curl --location --request PUT 'http://localhost:8080/users?_id={add user id here}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "deleted": true
}'
```

To update a user's parent:
```
curl --location --request PUT 'http://localhost:8080/users?_id={add user id here}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "parentId": "{add new parent ID here}"
}'
```

## CURL command DELETE

To permanently delete a user:
```
curl --location --request DELETE 'http://localhost:8080/users?_id={add user id here}'
```
