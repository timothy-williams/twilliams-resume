#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ResumeStack } from "../lib/resume-stack";

const app = new cdk.App();
new ResumeStack(app, "ResumeStack", {
  env: {
    account: '247158676068',
    region: 'us-east-1',
  }, // need to make sure these variables are configured properly
});
