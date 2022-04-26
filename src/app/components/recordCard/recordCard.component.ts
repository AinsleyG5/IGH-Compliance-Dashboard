// Angular
import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
// Vendor
import { EntityTypes, JobOrder } from '@bullhorn/bullhorn-types';
import * as Chart from 'chart.js';
// App
import { AppBridgeService, HttpService } from '../../services';
import { Util } from '../../util/util';
import { BullhornMeta, JobOrderResponse, BackgroundCandidate } from '../../interfaces/bullhorn';
import { Averages, HistoricJobCategory, JobCategory, ProbabilityScore, ProbabilityScoreInput } from '../../interfaces/examples';
import { DoughnutChartComponent } from '../../elements/doughnutChart/doughnutChart.component';
import { HistoricJobsComponent } from '../../elements/historicJobs/historicJobs.component';
import { NovoToastService, TextBoxControl, FormUtils, AppBridge } from 'novo-elements';
import { DateFormatPipe } from '../../date-format.pipe'
import { BackgroundCandidates, OnboardingCandidates, mainCandidateData } from '../../mockData/mockData';

@Component({
  selector: 'app-record-card',
  templateUrl: './recordCard.component.html',
  styleUrls: ['./recordCard.component.scss'],
})
export class RecordCardComponent implements OnInit {
  placementIDs: any;
  // Current job data
  currentJob: JobOrder;
  jobMeta: BullhornMeta;
  candCertReqFields: string[] = ['id','certification','candidateCertificationStatus','owner(id,firstName,lastName)','candidateCertificationName'];
  roeCOFields: string[] = ['id','int1','text1','dateAdded'];
  placementFields: string[] = ['id','candidate','onboardingDocumentReceivedCount','onboardingDocumentSentCount','onboardingPercentComplete','customText15','customText11','customText16','customText12','customText42','placementCertifications'];
  candCertReqFields2: string[] = ['id','candidate','certification','status'];
  onbSent: number;
  onbReceived: number;
  onbPercent: number;
  options: any;

  // Projected job data
  scoreBackground: number;
  scoreOnboarding: number;
  scoreDrug: number;
  scoreRequirements: number;
  scoreReadiness: number = 0.59;

  // Historic job data
  historicJobCategories: HistoricJobCategory[];
  averages: Averages;

  // Card declarations
  refresh: boolean = true;
  closed: boolean = true;
  move: boolean = true;
  padding: boolean = true;
  empDocIcon: string = 'add-item';

  start: number = 2000;
  end: number = 2005;
  created: number = 1995;

  message: string;
  messageIcon: string;

  // Extension data
  loading = true;
  connected = true;
  errorMessage: string;
  errorDetails: string;
  isNovoEnabled = false;
  showDetails = false;
  pieDelay = true;

  @ViewChild(DoughnutChartComponent) doughnutChartComponent: DoughnutChartComponent;
  @ViewChild(HistoricJobsComponent) historicJobsComponent: HistoricJobsComponent;

  private readonly corpId: number;
  private readonly privateLabelId: number;
  private readonly userId: number;
  entityIds: number[];
  certReqItems: any = [];
  contReqItems: any = [];
  activePlacementIDs: any = [];
  placementResponse: any;
  resp: any = [];
  candCertReqCount: any;
  current: any;
  currentROE: any[];
  roeReqCount: any;
  empReqItems: any = [];
  candidateID: any = [];
  dataToSend: BackgroundCandidate[];
  dataToSendDrug: BackgroundCandidate[];
  dataToSendOnb: BackgroundCandidate[];  
  dataToSendCred: BackgroundCandidate[];
  dataToSendReady: BackgroundCandidate[];
  backgroundCandidates: BackgroundCandidate[];
  onboardingCandidates: BackgroundCandidate[];
  backgroundCandAdj: {candidateName: string; candidateID: number; remainingDocs: number; icon: string}[];
  backgroundRemaining: number;
  drugRemaining: number;

  constructor(private appBridgeService: AppBridgeService,
              private httpService: HttpService,
              private route: ActivatedRoute,
              private toaster: NovoToastService,
              private formUtils: FormUtils,
              private dateFormat: DateFormatPipe) {
    // Get query string parameters passed over from Bullhorn
    this.userId = this.getBullhornId('UserID');
    this.corpId = this.getBullhornId('CorporationID');
    this.privateLabelId = this.getBullhornId('PrivateLabelID');
    this.entityIds = this.getBullhornIdList('EntityID');
    this.backgroundCandidates = BackgroundCandidates;
    this.onboardingCandidates = OnboardingCandidates;
    console.log(this.entityIds);
    this.connected = !!this.entityIds && !!this.userId && !!this.corpId && !!this.privateLabelId;
    console.log(`${this.userId}, ${this.corpId}, ${this.privateLabelId}`);
    Util.setHtmlExtensionClass('custom-action');
    Chart.defaults.global.defaultFontSize = 11;
  }

  ngOnInit(): void {
    if (this.connected) {
      this.appBridgeService.onRegistered.subscribe(this.onRegistered.bind(this));
      this.appBridgeService.registerCustomAction();
      setTimeout(() => {
        this.pieDelay = false;
      }, 2000)
    }
  }

  toggleDetails() {
    this.showDetails = !this.showDetails;
  }

  close(): void {
    this.appBridgeService.execute((bridge: AppBridge) => {
      bridge.close().then((success: any) => {
        console.log('[AppComponent] - Close Success!', success);
      });
    });
  }

  catchEv(type, ev) {
    // Set toast options
    this.options = {
      title: `${type}`,
      message: `${ev} fired...`,
      theme: 'ocean',
      icon: `${type}`,
      position: 'growlTopRight',
    }
  }

  private async onRegistered(isRegistered) {
    if (isRegistered) {
      this.connected = true;
      this.getAllData();
      if(!this.scoreBackground) {
        this.scoreBackground = 0.6;
      }
      this.isNovoEnabled = await this.appBridgeService.isNovoEnabled();
      if (this.isNovoEnabled) {
        document.body.className = 'zoom-out';
      }
      //this.loading = false;
    } else {
      this.getAllData();
      // this.connected = false;
      // this.buildCandidates(this.backgroundCandidates);
      // console.log(`backgrondCandAdj`, this.backgroundCandAdj);
      this.loading = false;
    }
  }

  private getAllData(): void {
    console.log("Im running getAllData()");
    // Create search strings
    const notDeleted = `isDeleted:false`;
    const credentialQuery = `${notDeleted} AND placement.id:[]`;

    // Construct calls
    const calls: Promise<any>[] = [];
    calls.push(this.httpService.getEntitys(EntityTypes.Placement, this.entityIds, this.placementFields.join(), 'off'));

    // Process the data received
    Promise.all(calls).then((responses: any[]) => {
      console.log("Promise.all Response: ", responses);
      this.placementResponse = responses[0].data;
      const backgroundPass = responses[0].data.filter(this.currentCheck);
      const backgroundFail = responses[0].data.filter(this.failCheck);
      console.log(`Background Fail: `, backgroundFail);
      const drugPass = responses[0].data.filter(this.drugPass);
      const drugFail = responses[0].data.filter(this.drugFail);
      const onboardingOutstanding = responses[0].data.filter(this.onboardingOutstanding);
      const onboardingComplete = responses[0].data.filter(this.onboardingComplete);
      const credentialComplete = responses[0].data.filter(this.credentialComplete);
      const candidatesReady = responses[0].data.filter(this.candidateReady);

      if(backgroundPass) {
        this.scoreBackground = backgroundPass.length / this.entityIds.length;
        this.scoreDrug = drugPass.length / this.entityIds.length;
        this.scoreOnboarding = onboardingComplete.length / this.entityIds.length;
        this.scoreRequirements = credentialComplete.length / this.entityIds.length;
        this.scoreReadiness = candidatesReady.length / this.entityIds.length
      }

      this.backgroundRemaining = backgroundFail.length;
      this.dataToSend = backgroundFail;
      this.drugRemaining = drugFail.length;
      this.dataToSendDrug = drugFail;
      this.dataToSendOnb = onboardingOutstanding;
      this.dataToSendCred = responses[0].data.filter(this.credentialOutstanding);
      this.dataToSendReady = responses[0].data.filter(this.candidateNotReady);

      // this.resp.push({ "title": 'Background Check', "data": backgroundPass });
      // this.resp.push({"title": 'Contract Requirements', "card": 'contractReqs', "data": responses[1].data, "percent": (responses[1] / responses[1]) * 100});
      // this.resp.push({"title": 'Employment Requirements', "card": 'employmentReqs', "data": responses[2].data, "percent": 0});
      
      // const candidateCurrent = this.resp[2].data.filter(this.currentCheckCand);
      // this.current = (placementCurrent.length > 0 || candidateCurrent > 0) ? (placementCurrent.length + candidateCurrent.length) : 0
      // this.currentROE = this.resp[1].data.filter(this.currentCheckROE);
      // const currentROENo = this.currentROE.length

      // const scoreCheck = (this.current / this.candCertReqCount)
      // console.log(`Score Check: `, scoreCheck);
      // this.scoreBackground =  (scoreCheck) ? scoreCheck : 0

      // const scoreCheckROE = ( currentROENo / this.roeReqCount);
      // this.scoreOnboarding = (scoreCheckROE) ? scoreCheckROE : 0
      
      // this.buildItems(this.resp);
      // console.log(`Build items: `, this.certReqItems);
      this.loading = false;
    }).catch(this.handleError.bind(this));
  }

  /**
   * Calculate this job's important dates and date ranges, based on creation/start/average days to fill
   */
  private calculateDatesAndRanges() {
    const dateNow = new Date();
    let date1Year = this.dateFormat.transform(dateNow, 1);
    console.log("Date1Year = ", date1Year);
  }

  randomDataRequest(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.appBridgeService.execute((appBridge: AppBridge) => {
        appBridge.httpGET(`entity/Placement/5184?fields=id,candidate,customText11&meta=off`).then((response: any) => {
          console.log(`Random request Response`, response);
          this.handleAppBridgeResponse(response, resolve, reject);
        }).catch((error: Error) => {
          reject(error);
        });
      });
    });
  }

  handleAppBridgeResponse(response: any, resolve: (any) => void, reject: (any) => void): void {
    if (!response) {
      reject(response);
    } else if (response.error) {
      reject(response.error);
    } else if (response.data) {
      resolve(response.data);
    } else {
      resolve(response);
    }
  }

  private candidateReady(response: any) {
    return response.customText42 == "Yes";
  }

  private candidateNotReady(response: any) {
    return response.customText42 != "Yes";
  }

  private credentialComplete(response: any) {
    return response.placementCertifications.total > 0;
  }

  private credentialOutstanding(response: any) {
    return response.placementCertifications.total == 0;
  }

  private onboardingComplete(response: any) {
    return response.onboardingPercentComplete == 100;
  }

  private onboardingOutstanding(response: any) {
    return response.onboardingPercentComplete < 100;
  }

  private currentCheck(response: any) {
    if(response.customText11 == 'Pass' || response.customText11 == 'Non-Compliance') {
      return true;
    }
  }

  private failCheck(response: any) {
    if(response.customText11 != 'Pass' && response.customText11 != 'Non-Compliance') {
      return true;
    }
  }

  private drugPass(response: any) {
    if(response.customText12 == 'Pass' || response.customText12 == 'Non-Compliance') {
      return true;
    }
  }

  private drugFail(response: any) {
    if(response.customText12 != 'Pass' && response.customText12 != 'Non-Compliance') {
      return response.customText12 != 'Pass';
    }
  }

  private buildCandidates(candidates: any) {
    for (const obj of candidates) {
      const item: any = {};

      item.candidateName = obj.candidate.firstName + obj.candidate.lastName;
      item.candidateID = obj.candidate.id;
      item.remainingDocs = Math.floor(Math.random() * 6) + 1;
      item.icon = 'candidate';

      this.backgroundCandAdj.push(item);
    }
  }

  private buildItems(resp: any) {
    for (const obj of resp) {
      const item: any = {};
      item.icon = {};

      item.value = obj.data;
      item.percent = (obj.percent) ? obj.percent.toFixed(2) : null;
      item.info = `${obj.title}`;
      item.icon.name = (obj.percent > 15) ? 'bhi-trending-down': 'bhi-trending-up';
      item.icon.sentiment = (obj.percent > 15) ? 'negative': 'positive';

      switch(obj.card) {
        case 'candidateCertReqs':
          this.certReqItems.push(item);
          item.type = `candidate`;
          break;
        case 'contractReqs':
          this.contReqItems.push(item);
          item.type = `company`;
          break;
        case 'employmentReqs':
          this.empReqItems.push(item);
          item.type = `add-file`;
          break;
      }
    }
  }

  /**
   * Print debugging information in the console
   */
  // private printDebuggingInfo() {
  //   const averagesTable: any = {
  //     'Company': Util.roundForPrinting(this.historicJobCategories[JobCategory.Company].averages),
  //     'Regional': Util.roundForPrinting(this.historicJobCategories[JobCategory.Role].averages),
  //   };
  //   averagesTable.Average = Util.roundForPrinting(this.averages);
  //   console.table(averagesTable);
  //   const options = { day: 'numeric', month: 'short', year: 'numeric' };
  //   const calculationsTable: any = {
  //     daysOpen: this.daysOpen,
  //     projectedStartDate: this.projectedStartDate.toLocaleDateString('en-US', options),
  //     projectedFillDate: this.projectedFillDate.toLocaleDateString('en-US', options),
  //     daysSpent: this.daysSpent,
  //     daysRemaining: this.daysRemaining,
  //     numOpenings: this.numOpenings,
  //     numSubmissions: this.numSubmissions,
  //     score: Util.roundToPrecision(this.score, 3),
  //   };
  //   if (this.daysUntilStartDate > 0) {
  //     calculationsTable.daysUntilStartDate = this.daysUntilStartDate;
  //   }
  //   console.table(calculationsTable);
  // }

  onClose() {
    this.toaster.alert({
      theme: 'info',
      title: 'Cards',
      message: 'Close Clicked!',
    });
  }

  onRefresh() {
    this.toaster.alert({
      theme: 'success',
      title: 'Cards',
      message: 'Refresh Clicked!',
    });
  }

  private openJob(event: { originalEvent: MouseEvent; row: BackgroundCandidate }): void {
    this.appBridgeService.openJob(event.row.id);
  }

  private handleError(err: Error) {
    this.errorMessage = 'Cannot get record data from Bullhorn.';
    this.errorDetails = err ? err.message : `Error communicating via App Bridge`;
    this.loading = false;
  }

  private getBullhornId(param: string): number {
    return parseInt(this.route.snapshot.queryParamMap.get(param), 10);
  }

  private getBullhornIdList(param: string): number[] {
    const idListString = this.route.snapshot.queryParamMap.get(param);
    return idListString ? idListString.split(',').map(idString => parseInt(idString, 10)) : [];
  }
}
