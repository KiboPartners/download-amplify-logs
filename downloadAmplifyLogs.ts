import 'dotenv/config';
import { Configuration } from "@kibocommerce/rest-sdk";
import * as runtime from '@kibocommerce/rest-sdk/client-runtime'
import fs from 'fs'

const BRANCH_NAME = "kibo-sb-main"
const LOGS_TO_PULL = 1


class AmplifyLogApi extends runtime.BaseAPI {
  constructor(configuration: Configuration) {
    super(configuration)
  }
  async getBuildJobs(branchName: string): Promise<GetBuildJobsResponse> {
    const headers = {}
    await this.addAuthorizationHeaders(headers)
    const res = await this.request({
      path: `/platform/appdev/headless-app/builds/${branchName}`,
      method: 'GET',
      headers: headers,
    })

    return await new runtime.JSONApiResponse(res).value() as GetBuildJobsResponse
  }
  async getBuildLog(branchName: string, jobId: string): Promise<BuildJobLogResponse> {
    const headers = {}
    await this.addAuthorizationHeaders(headers)
    const res = await this.request({
      path: `/platform/appdev/headless-app/builds/${branchName}/logs/${jobId}`,
      method: 'GET',
      headers: headers,
    })

    return await new runtime.JSONApiResponse(res).value() as BuildJobLogResponse
  }
}

const configuration = new Configuration({
  tenantId: process.env.KIBO_TENANT,
  siteId: process.env.KIBO_SITE,
  sharedSecret: process.env.KIBO_SHARED_SECRET,
  clientId: process.env.KIBO_CLIENT_ID,
  authHost: process.env.KIBO_AUTH_HOST,
  apiEnv: process.env.KIBO_API_ENV
});

const amplifyLogResource = new AmplifyLogApi(configuration)

async function main() {
  try {
    const buildLogs = await amplifyLogResource.getBuildJobs(BRANCH_NAME)

    console.log(`Fetching the latest ${LOGS_TO_PULL} jobs.`)

    for (let i = 0; i < LOGS_TO_PULL; i++) {
      const buildLog = buildLogs.jobs[i]
      console.log(buildLog)

      const logFolder = `JobID_${buildLog.jobId}_${new Date().toISOString()}`
      const logPath = `./logs/${logFolder}`

      fs.mkdirSync(logPath)

      const job = await amplifyLogResource.getBuildLog(BRANCH_NAME, buildLog.jobId)
      console.log(job)

      const steps = job.steps

      for (let step of steps) {
        const stepName = step.stepName
        const stepStatus = step.status

        if (step.logUrl) {
          const file = await (await fetch(step.logUrl)).text()
          fs.writeFileSync(`${logPath}/${stepName}_${stepStatus}.txt`, file, { encoding: 'utf-8' })
        } else {
          console.log(`No log file for ${stepName}_${stepStatus}`)
        }
      }
    }

  } catch (e: any) {
    console.error(e)
  }

  console.log('DONE')

}

main();



export interface BuildJobStep {
  stepName: string,
  status: string,
  logUrl: string,
  startTime: string,
  endTime: string
}

export interface BuildJobLogResponse {
  jobId: string,
  steps: BuildJobStep[]
}

export interface BuildJob {
  jobId: string,
  status: string,
  commitId: string,
  commitTime: string,
  startTime: string,
  endTime: string
}

export interface GetBuildJobsResponse {
  nextToken?: string,
  jobs: BuildJob[]
}