# ec-ses-notifications-lambda

Lambda function to read SNS topic with notifications from SES and send it to Elastic Search Index

### AWS env vars:

- *ES_DOMAIN*: Elastic Search domain
- *ES_INDEX*: Elastic Search index to store notifications
- *ES_TYPE*: Elastic Search Document Type
