import { Resource, TerraformOutput } from "cdktf";
import { Construct } from "constructs";
import { S3Bucket, S3BucketAcl, S3BucketWebsiteConfiguration } from "../.gen/providers/aws/s3";
import { StringResource } from "../.gen/providers/random";

const s3Config = require("../config/s3.json");

interface Options {
    vpcId: string
}

/**
 * Class to create required s3 buckets.
 */
class S3Resource extends Resource {
    options: Options;

    constructor(scope: Construct, name: string, options: Options) {
        super(scope, name);

        this.options = options;
    }

    /**
     * Main performer of the class.
     */
    perform() {
        const randomString = this._generateRandomSuffix();

        const blogBucket = this._createBlogAssetBucket(randomString);

        const staticBucket = this._createStaticAssetBucket(randomString);

        const configsBucket = this._createConfigsBucket(randomString);

        return { blogBucket, staticBucket, configsBucket };
    }

    /**
     * Generate random suffix string to attach to bucket names.
     * @private
     */
    _generateRandomSuffix() {
        const stringResource = new StringResource(this, "random_string", {
            length: 8,
            lower: true,
            upper: false,
            special: false,
            numeric: true,
            minNumeric: 2,
            keepers: {
                "vpc_id": this.options.vpcId
            }
        });

        new TerraformOutput(this, "random_string_s3", {
            value: stringResource.result,
        });

        return stringResource.result;
    }

    /**
     * Create bucket to store blog assets.
     *
     * @param randomSuffix
     * @private
     */
    _createBlogAssetBucket(randomSuffix: string) {
        const blogContentS3BucketName =  s3Config.blogContentS3BucketName.concat("-", randomSuffix);

        return new S3Bucket(this, "plg-gh-blog-assets", {
            bucket: blogContentS3BucketName
        });
    }

    /**
     * Create bucket to store static assets.
     *
     * @param randomSuffix
     * @private
     */
    _createStaticAssetBucket(randomSuffix: string) {
        const blogStaticS3BucketName = s3Config.blogStaticS3BucketName.concat("-", randomSuffix);

        const staticBucket = new S3Bucket(this, "plg-gh-static-assets", {
            bucket: blogStaticS3BucketName,
        });

        new S3BucketAcl(this, "plg-gh-static-assets-acl", {
           acl: "public-read",
           bucket: staticBucket.bucket
        });

        new S3BucketWebsiteConfiguration(this, "plg-gh-website-configuration", {
            bucket: staticBucket.bucket,
            indexDocument: {
                suffix: "index.html"
            },
            errorDocument: {
                key: "blog/404/index.html"
            }
        });

        return staticBucket;
    }

    /**
     * Create bucket to store configuration files.
     *
     * @param randomSuffix
     * @private
     */
    _createConfigsBucket(randomSuffix: string) {
        const configsBucket = s3Config.configsS3BucketName.concat("-", randomSuffix);

        return new S3Bucket(this, "plg-gh-configs", {
            bucket: configsBucket
        });
    }
}

export { S3Resource };
