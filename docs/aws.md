# AWS configuration

Set up:

1. **S3 bucket** to hold the files
1. **CloudFront distribution** for caching and a shorter URL
1. **Policy** to read and write to the S3 bucket, and clear the CloudFront cache
1. **User** to get an access key and secret key

## S3 bucket

1. Go to [S3](https://us-west-2.console.aws.amazon.com/s3/home?region=us-west-2)
1. Switch to your preferred region. I like **United States (Oregon, us-west-2)**
1. Click **Create bucket**
    - **Bucket name**: `my-podcastdn-bucket` (or whatever)
    - Uncheck **Block all public access**
    - Check the **I acknowledge** box
    - Click **Create bucket**
1. Select that bucket, then go to the **Permissions** tab
1. Scroll down to **Bucket policy** and click **Edit**
1. Enter this JSON, changing the **Resource** value to the name of your S3 bucket. Don't forget the `/*` at the end.
    ```json
    {
    	"Version": "2012-10-17",
    	"Statement": [
    		{
    			"Effect": "Allow",
    			"Principal": "*",
    			"Action": "s3:GetObject",
    			"Resource": "arn:aws:s3:::my-podcastdn-bucket/*"
    		}
    	]
    }
    ```
9. Click **Save changes**

## CloudFront distribution

1. Go to [CloudFront](https://us-east-1.console.aws.amazon.com/cloudfront/v4/home?region=us-west-2#/distributions)
2. Click **Create distribution**
    - CloudFront has a new pricing scheme that is free but automatically sets several options for you. Pick that, if you're not sure.
    - Find the **Origin domain** field
    - Select your **my-podcastdn-bucket** bucket
    - A yellow warning message about static site hosting should come up. Click the **Use website endpoint** button.
    - It will change your origin domain
        - from e.g. `my-podcastdn-bucket.s3.us-west-2.amazonaws.com`
        - to `my-podcastdn-bucket.s3-website-us-west-2.amazonaws.com`
4. Click **Create distribution**

## Policy

1. Go to [IAM Policies](https://us-east-1.console.aws.amazon.com/iam/home?region=us-west-2#/policies)
1. Click **Create policy**
1. Select the **JSON** toggle
1. Enter the JSON below, changing the name of the bucket and the CloudFront distribution resource ARN
    ```json
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "S3Access",
                "Effect": "Allow",
                "Action": [
                    "s3:PutObject",
                    "s3:DeleteObject",
                    "s3:GetObject"
                ],
                "Resource": [
                    "arn:aws:s3:::my-podcastdn-bucket/*"
                ]
            },
            {
                "Sid": "S3BucketAccess",
                "Effect": "Allow",
                "Action": [
                    "s3:ListBucket"
                ],
                "Resource": [
                    "arn:aws:s3:::my-podcastdn-bucket"
                ]
            },
            {
                "Sid": "CloudFrontInvalidation",
                "Effect": "Allow",
                "Action": [
                    "cloudfront:CreateInvalidation",
                    "cloudfront:ListInvalidations",
                    "cloudfront:GetInvalidation"
                ],
                "Resource": "arn:aws:cloudfront::12345:distribution/ABCDE"
            }
        ]
    }
    ```
1. Click **Next**
1. **Policy name:** (any name you like)
1. Click **Create policy**

## User

1. Go to [IAM Users](https://us-east-1.console.aws.amazon.com/iam/home?region=us-west-2#/users)
1. Click **Create user**
1. **User name:** (any name you like, but I usually make mine the same as the policy name)
1. Click **Next**
1. Select **Attach policies directly**
1. Search for and check the box of the policy you just created
1. Click **Next**
1. Click **Create user**
1. Select that user
1. Click **Create access key**
1. For **Use case,** select **Other** and click **Next**
1. For **Description tag value**, give it a name describing where it will be used (e.g. my site's PodCastDN)
1. Click **Create access key**
1. The access key and secret access key will be shown. Copy them or download the CSV to save the values.

Use the **access key** and **secret key** in your environment variables for this app.