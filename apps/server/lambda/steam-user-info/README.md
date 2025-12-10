# steps

-   Open AWS Lambda create a function (In permission, Using an existing role 'sync-steam-user-role' which added the sqs and lambda permission)
-   Add related sqs trigger
-   Upload the zip file ,which is compressed from files in the folder(need to npm install including node_modules) , on the 'Code' block
-   Set trigger configure and enviroment configure in 'Configuration' block
-   Monitor it in 'Monitor' block or View CloudWatch logs in 'Monitor' block
