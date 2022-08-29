import { Fn, Resource } from 'cdktf';
import { Construct } from 'constructs';

import { Vpc } from '../.gen/modules/vpc';
import { DataAwsSubnet } from '../.gen/providers/aws/vpc';
import { DataAwsAvailabilityZones } from '../.gen/providers/aws/datasources';

import { getPrivateSubnetCidrBlocks, getPublicSubnetCidrBlocks } from '../lib/util';
import vpcConfig from '../config/vpc.json';

interface Options {
  useExistingVpc: boolean;
  vpcSubnets: string[];
  vpcPublicSubnets: string[];
}

interface Response {
  vpcId: string;
  vpcSubnets: string[];
  vpcPublicSubnets: string[];
}

interface Response {
  vpcId: string;
  vpcSubnets: string[];
  vpcPublicSubnets: string[];
}

/**
 * Class to create VPC and subnets.
 */
class VpcResource extends Resource {
  options: Options;

  constructor(scope: Construct, name: string, options: Options) {
    super(scope, name);

    this.options = options;
  }

  /**
   * Main performer.
   */
  perform(): Response {
    const privateSubnetCidrBlocks = this._getSubnetCidr();

    const zones = this._getZones();

    return this._getOrCreateVpc(privateSubnetCidrBlocks, zones);
  }

  /**
   * Get required private subnet cidr blocks.
   *
   * @private
   */
  _getSubnetCidr(): string[] {
    if (this.options.useExistingVpc) {
      return [];
    }

    return getPrivateSubnetCidrBlocks(vpcConfig.cidrPrefix, vpcConfig.numberOfPrivateSubnets, 2);
  }

  /**
   * Get available zones for the VPC.
   *
   * @private
   */
  _getZones(): DataAwsAvailabilityZones {
    const zones = new DataAwsAvailabilityZones(this, 'zones', {
      state: 'available',
    });

    return zones;
  }

  /**
   * Get or Create VPC
   *
   * @param privateSubnetCidrBlocks
   * @param zones
   * @private
   */
  _getOrCreateVpc(privateSubnetCidrBlocks: string[], zones: DataAwsAvailabilityZones): Response {
    let vpcId, vpcSubnets, vpcPublicSubnets: string[];

    if (this.options.useExistingVpc) {
      const subnetData = new DataAwsSubnet(this, 'subnet', {
        id: this.options.vpcSubnets[0],
      });
      vpcId = subnetData.vpcId;
      vpcSubnets = this.options.vpcSubnets;
      vpcPublicSubnets = this.options.vpcPublicSubnets;
    } else {
      const vpcOptions = {
        name: vpcConfig.nameLabel,
        azs: [Fn.element(zones.names, 0), Fn.element(zones.names, 1)],
        cidr: vpcConfig.cidrPrefix,
        publicSubnets: getPublicSubnetCidrBlocks(vpcConfig.cidrPrefix),
        publicSubnetTags: {
          Name: vpcConfig.nameLabel + ' public',
        },
        privateSubnets: privateSubnetCidrBlocks,
        privateSubnetTags: {
          Name: vpcConfig.nameLabel + ' private',
        },
        enableNatGateway: true,
        singleNatGateway: true,
        enableDnsHostnames: true,
      };

      const vpc = new Vpc(this, vpcConfig.nameIdentifier, vpcOptions);

      vpcId = vpc.vpcIdOutput;
      vpcSubnets = Fn.tolist(vpc.privateSubnetsOutput);
      vpcPublicSubnets = Fn.tolist(vpc.publicSubnetsOutput);
    }

    return { vpcId, vpcSubnets, vpcPublicSubnets };
  }
}

export { VpcResource };
