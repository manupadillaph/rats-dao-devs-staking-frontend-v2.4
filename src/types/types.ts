import { SpendingValidator, Assets , UTxO, TxHash, PaymentKeyHash, MintingPolicy, C, toHex, fromHex, Data, Address} from "lucid-cardano"
import { strToHex, toJson } from "../utils/utils";

//--------------------------------------------------------

export type EUTxO = {
    // address: string,
    // datumIndex : number;
    datum : any;
    uTxO    : UTxO;
    isPreparing : Maybe<POSIXTime>;
    isConsuming : Maybe<POSIXTime>;
}

export type UTxO_Simple = {
    txHash: TxHash;
    outputIndex: number;
}

//--------------------------------------------------------

export declare type POSIXTime = BIGINT

export declare type CurrencySymbol = string

export declare type TokenName = string

export type AssetClass = {
    currencySymbol : CurrencySymbol;
    tokenName    : TokenName;
}

//lo uso como class a diferencia del resto, por que a la hora de convertir el datum y el redeemer a plutusData, el campo de Hash aqui no se convierte igual que un string y si no tengo clase no podria diferenciarlo de una string en ese momento.
export class TxOutRef    {
    plutusDataIndex = 0 

    txHash: TxHash;
    outputIndex: number;

    constructor(txHash: TxHash, outputIndex: number) {
        this.txHash = txHash;
        this.outputIndex = outputIndex;
    }
};

//-------------------------------------------------------------

export declare type Master = PaymentKeyHash
export declare type User = PaymentKeyHash
export declare type StakeCredentialPubKeyHash = PaymentKeyHash

export declare type BIGINT = bigint

export declare type AC = string
export declare type CS = string
export declare type TN = string

export declare type FundID_TN = TN
export declare type UserID_TN = TN

//-------------------------------------------------------------


export class Maybe<T> {
    plutusDataIndex = 0 | 1
    val : T | undefined
    constructor (val? : T) {
        if (val != undefined) {
            this.val = val;
            this.plutusDataIndex = 0
        } else {
            this.val = undefined;
            this.plutusDataIndex = 1
        }
    };
}


//-------------------------------------------------------------

export type InterestRate = InterestRateV1 | InterestRateV2
export type InterestRates = InterestRateV1 [] | InterestRateV2 []
export class InterestRateV1 {
    iMinDays: Maybe<number>;
    iPercentage: number ;
    constructor(    iMinDays : Maybe<number>,
                                iPercentage : number) {
        this.iMinDays = iMinDays;
        this.iPercentage = iPercentage;
    }
}

export class InterestRateV2 {
    iMinDays: Maybe<number>;
    iStaking: number ;
    iHarvest: number ;
    constructor(    iMinDays : Maybe<number>,
        iStaking : number, iHarvest : number) {
        this.iMinDays = iMinDays;
        this.iStaking = iStaking;
        this.iHarvest = iHarvest;
    }
}

//-------------------------------------------------------------

export type PoolParams = PoolParamsV1 | PoolParamsV2

export type PoolParamsV1 = { 
    ppPoolID_CS    : CS, 
    ppMasters : Master[], 
    ppBegintAt        : POSIXTime, 
    ppDeadline        : POSIXTime, 
    ppGraceTime : POSIXTime, 
    ppStaking_CS        : CS, 
    ppStaking_TN        : TN, 
    ppHarvest_CS        : CS, 
    ppHarvest_TN        : TN, 
    ppInterestRates        : InterestRateV1[]
}

export type PoolParamsV2 = { 
    ppPoolID_CS    : CS, 
    ppMasters : Master[], 
    ppBegintAt        : POSIXTime, 
    ppDeadline        : POSIXTime, 
    ppGraceTime : POSIXTime, 
    ppStaking_CS        : CS, 
    ppStaking_TN        : TN, 
    ppHarvest_CS        : CS, 
    ppHarvest_TN        : TN, 
    ppInterestRates     : InterestRateV2[]
}

//-------------------------------------------------------------

export class Master_Funder {
    plutusDataIndex = 0

    mfMaster : Master
    mfStakeCredential : Maybe<StakeCredentialPubKeyHash>

    mfFundAmount : BIGINT
    mfClaimedFund : number
    mfMinAda : BIGINT
    constructor(    mfMaster : Master,
                    mfStakeCredential : Maybe<StakeCredentialPubKeyHash>,
                    mfFundAmount : BIGINT,
                    mfClaimedFund : number, 
                    mfMinAda : BIGINT
                                ) {
        this.mfMaster = mfMaster;
        this.mfStakeCredential = mfStakeCredential;
        this.mfFundAmount = mfFundAmount;
        this.mfClaimedFund = mfClaimedFund;
        this.mfMinAda = mfMinAda;
    }
}

//-------------------------------------------------------------

export type Datum_and_Values_for_FundDatum = { datum: FundDatum, value: Assets }

//-------------------------------------------------------------

export class PoolDatum { 
    static plutusDataIndex = 0 
    plutusDataIndex = 0

    subtypo = true //es un subtipo de Validator_Datum, y necesita dos niveles de constr para serializar

    pdMasterFunders: Master_Funder []
    pdFundCount: number
    pdTotalCashedOut : BIGINT
    pdClosedAt! : Maybe<POSIXTime>
    pdIsTerminated!    : number
    pdIsEmergency!    : number
    pdMinAda : BIGINT

    constructor(pdMasterFunders : Master_Funder [], pdFundCount : number, pdTotalCashedOut : BIGINT, pdClosedAt : Maybe<POSIXTime>, pdIsTerminated : number, pdIsEmergency : number, pdMinAda : BIGINT) {

        this.pdMasterFunders = pdMasterFunders.sort((a,b) => {
            if (a.mfMaster < b.mfMaster) return -1
            if (a.mfMaster > b.mfMaster) return 1
            return 0
        })

        this.pdFundCount = pdFundCount
        this.pdTotalCashedOut = pdTotalCashedOut
        this.pdClosedAt = pdClosedAt
        this.pdIsTerminated = pdIsTerminated
        this.pdIsEmergency = pdIsEmergency
        this.pdMinAda = pdMinAda

        // console.log ("PoolDatum: " + toJson(this))
    }
}

export function mkPoolDatum_FromCbor ( datumCbor : string){
    
    var pdMaster_Funders : Master_Funder[] = []
    var pdFundCount : number
    var pdTotalCashedOut!    : BIGINT
    var pdClosedAt! : Maybe<POSIXTime>
    var pdIsTerminated!    : number
    var pdIsEmergency!    : number
    var pdMinAda!    : BIGINT

    const lucidDataForDatum : any = Data.from(datumCbor)    
    // index 0 = PoolDatum
    if (lucidDataForDatum.index == PoolDatum.plutusDataIndex) {

        const lucidDataForConstr0 = lucidDataForDatum.fields

        //constr para lista de campos Pool Datum
        if (lucidDataForConstr0[0].index == 0) {
            
            //lista de campos de Pool Datum
            const lucidDataForFields= lucidDataForConstr0[0].fields

            if (lucidDataForFields.length == 7) {

                const lucidDataForMaster_Funders = lucidDataForFields[0]
                pdFundCount = Number (lucidDataForFields[1])
                pdTotalCashedOut = BigInt (lucidDataForFields[2])
                const lucidDataForIsClosedAt = lucidDataForFields[3]
                pdIsTerminated = Number (lucidDataForFields[4])
                pdIsEmergency = Number (lucidDataForFields[5])
                pdMinAda = BigInt (lucidDataForFields[6])

                for (var i=0;i< lucidDataForMaster_Funders.length;i+=1){
                    const lucidDataForMaster_Funder = lucidDataForMaster_Funders[i]
                    if (lucidDataForMaster_Funder.index == 0){

                        var mfMaster : Master
                        var mfStakeCredential : Maybe<StakeCredentialPubKeyHash>
                        var mfFundAmount : BIGINT
                        var mfClaimedFund : number
                        var mfMinAda : BIGINT

                        //lista de campos de Master Funder
                        const lucidDataForFieldsMasterFunder = lucidDataForMaster_Funder.fields

                        if (lucidDataForFieldsMasterFunder.length == 5) {

                            mfMaster = lucidDataForFieldsMasterFunder[0]
                            const lucidDataForStakeCredential = lucidDataForFieldsMasterFunder[1]
                            mfFundAmount = BigInt (lucidDataForFieldsMasterFunder[2])
                            mfClaimedFund = Number (lucidDataForFieldsMasterFunder[3])
                            mfMinAda = BigInt (lucidDataForFieldsMasterFunder[4])
                            
                            if (lucidDataForStakeCredential.index == 0) {
                                mfStakeCredential = new Maybe<StakeCredentialPubKeyHash>(lucidDataForStakeCredential.fields[0])
                            }else{
                                mfStakeCredential = new Maybe<StakeCredentialPubKeyHash>()
                            }

                            var masterFunder = new Master_Funder (mfMaster, mfStakeCredential, mfFundAmount, mfClaimedFund, mfMinAda)

                            pdMaster_Funders.push(masterFunder)
                        
                        }else{
                            throw "Error: Can't get FundDatum"	
                        }

                    }else{
                        throw "Error: Can't get FundDatum"	
                    }
                }

                if (lucidDataForIsClosedAt.index == 0) {
                    pdClosedAt = new Maybe(BigInt(lucidDataForIsClosedAt.fields[0]))
                }else{
                    pdClosedAt = new Maybe<POSIXTime>()
                }

            }else{
                throw "Error: Can't get PoolDatum"	
            }
            return new PoolDatum (pdMaster_Funders, pdFundCount, pdTotalCashedOut, pdClosedAt, pdIsTerminated, pdIsEmergency, pdMinAda)
        }else{
            throw "Error: Can't get PoolDatum"	
        }
    }else{
        throw "Error: Can't get PoolDatum"	
    }
}

//-------------------------------------------------------------

export class FundDatum { 
    static plutusDataIndex = 1
    plutusDataIndex = 1

    subtypo = true //es un subtipo de Validator_Datum, y necesita dos niveles de constr para serializar

    fdFundAmount : BIGINT
    fdCashedOut : BIGINT
    fdMinAda : BIGINT

    constructor(    
            fdFundAmount : BIGINT,
            fdCashedOut : BIGINT,
            fdMinAda : BIGINT
        ) 
        {
            this.fdFundAmount = fdFundAmount
            this.fdCashedOut = fdCashedOut
            this.fdMinAda = fdMinAda

        // console.log ("FundDatum: " + toJson(this))

    }
} 

export function mkFundDatum_FromCbor ( datumCbor : string){

    var fdFundAmount : BIGINT
    var fdCashedOut : BIGINT
    var fdMinAda : BIGINT

    const lucidDataForDatum : any = Data.from(datumCbor)    

    // index 1 = Fund Datum
    if (lucidDataForDatum.index == FundDatum.plutusDataIndex) {

        const lucidDataForConstr0 = lucidDataForDatum.fields

        //constr para lista de campos Fund Datum
        if (lucidDataForConstr0[0].index == 0) {

             //lista de campos de FundDatum
             const lucidDataForFields= lucidDataForConstr0[0].fields

            if (lucidDataForFields.length == 3) {
                
                fdFundAmount = BigInt(lucidDataForFields[0])
                fdCashedOut = BigInt(lucidDataForFields[1])
                fdMinAda = BigInt(lucidDataForFields[2])

                return new FundDatum (fdFundAmount, fdCashedOut, fdMinAda) 

            }else{
                throw "Error: Can't get FundDatum"	
            }
        }else{
            throw "Error: Can't get FundDatum"	
        }
    }else{
        throw "Error: Can't get FundDatum"	
    }
}


//-------------------------------------------------------------



export class UserDatum {     
    static plutusDataIndex = 2
    plutusDataIndex = 2
    subtypo = true //es un subtipo de Validator_Datum, y necesita dos niveles de constr para serializar

    udUser     : User
    udStakeCredential : Maybe<StakeCredentialPubKeyHash>
    udInvest     : BIGINT
    udCreatedAt    : POSIXTime
    udCashedOut     : BIGINT
    udRewardsNotClaimed     : BIGINT
    udLastClaimAt     : Maybe<POSIXTime>
    udMinAda : BIGINT

    constructor(
                udUser     : User, 
                udStakeCredential     : Maybe<StakeCredentialPubKeyHash>, 
                udInvest     : BIGINT,
                udCreatedAt    : POSIXTime,
                udCashedOut     : BIGINT,
                udRewardsNotClaimed     : BIGINT,
                udLastClaimAt     : Maybe<POSIXTime>,
                udMinAda : BIGINT
                ) {
        this.udUser    = udUser 
        this.udStakeCredential    = udStakeCredential 
        this.udInvest    = udInvest    
        this.udCreatedAt    = udCreatedAt 
        this.udCashedOut = udCashedOut     
        this.udRewardsNotClaimed    = udRewardsNotClaimed
        this.udLastClaimAt    = udLastClaimAt    
        this.udMinAda    = udMinAda    

        // console.log ("UserDatum: " + toJson(this))

    }
}

export function mkUserDatum_FromCbor ( datumCbor : string){

    var udUser : User
    var udStakeCredential : Maybe<StakeCredentialPubKeyHash>
    var udInvest : BIGINT
    var udCreatedAt : POSIXTime
    var udCashedOut : BIGINT
    var udRewardsNotClaimed : BIGINT
    var udLastClaimAt : Maybe<POSIXTime>
    var udMinAda : BIGINT

    const lucidDataForDatum : any = Data.from(datumCbor)    

    // index 2 = User Datum
    if (lucidDataForDatum.index == UserDatum.plutusDataIndex) {

        const lucidDataForConstr0 = lucidDataForDatum.fields

        //constr para lista de campos User Datum
        if (lucidDataForConstr0[0].index == 0) {

             //lista de campos de FundDatum
             const lucidDataForFields= lucidDataForConstr0[0].fields

            if (lucidDataForFields.length == 8) {
                
                udUser = lucidDataForFields[0]
                const lucidDataForStakeCredential = lucidDataForFields[1]
                udInvest =BigInt( lucidDataForFields[2])
                udCreatedAt = BigInt(lucidDataForFields[3])
                udCashedOut = BigInt(lucidDataForFields[4])
                udRewardsNotClaimed = BigInt(lucidDataForFields[5])
                const lucidDataForLastClaimAt = lucidDataForFields[6]
                udMinAda = BigInt( lucidDataForFields[7])

                if (lucidDataForStakeCredential.index == 0) {
                    udStakeCredential = new Maybe<StakeCredentialPubKeyHash>(lucidDataForStakeCredential.fields[0])
                }else{
                    udStakeCredential = new Maybe<StakeCredentialPubKeyHash>()
                }

                if (lucidDataForLastClaimAt.index == 0) {
                    udLastClaimAt = new Maybe(BigInt(lucidDataForLastClaimAt.fields[0]))
                }else{
                    udLastClaimAt = new Maybe<POSIXTime>()
                }

                return new UserDatum (udUser, udStakeCredential, udInvest, udCreatedAt, udCashedOut, udRewardsNotClaimed, udLastClaimAt, udMinAda)

            }else{
                throw "Error: Can't get UserDatum"	
            }
        }else{
            throw "Error: Can't get UserDatum"	
        }
    }else{
        throw "Error: Can't get UserDatum"	
    }
}

//-------------------------------------------------------------

export class ScriptDatum {    //es para saber que utxo tiene el contrato principal
    static plutusDataIndex = 3 
    plutusDataIndex = 3
    subtypo = true //es un subtipo de Validator_Datum, y necesita dos niveles de constr para serializar
    sdMaster     : Master
    sdStakeCredential : Maybe<StakeCredentialPubKeyHash>

    constructor(sdMaster     : Master, sdStakeCredential : Maybe<StakeCredentialPubKeyHash>) {
        this.sdMaster    = sdMaster 
        this.sdStakeCredential    = sdStakeCredential
        // console.log ("ScriptDatum: " + toJson(this))
    }
}

//-------------------------------------


export function mkScriptDatum_FromCbor ( datumCbor : string){
    var sdMaster : User
    var sdStakeCredential : Maybe<StakeCredentialPubKeyHash>

    const lucidDataForDatum : any = Data.from(datumCbor)    
    if (lucidDataForDatum.index == ScriptDatum.plutusDataIndex) {
        const lucidDataForConstr0 = lucidDataForDatum.fields
        //constr para lista de campos
        if (lucidDataForConstr0[0].index == 0) {
            //lista de campos del tipo de datum
            const lucidDataForFields= lucidDataForConstr0[0].fields
            if (lucidDataForFields.length == 2) {
                sdMaster = lucidDataForFields[0]
                const lucidDataForStakeCredential = lucidDataForFields[1]

                if (lucidDataForStakeCredential.index == 0) {
                    sdStakeCredential = new Maybe<StakeCredentialPubKeyHash>(lucidDataForStakeCredential.fields[0])
                }else{
                    sdStakeCredential = new Maybe<StakeCredentialPubKeyHash>()
                }

                return new ScriptDatum (sdMaster, sdStakeCredential)
            }else{
                throw "Error: Can't get ScriptDatum"	
            }
        }else{
            throw "Error: Can't get ScriptDatum"	
        }
    }else{
        throw "Error: Can't get ScriptDatum"	
    }
}

//-------------------------------------------------------------

export type Validator_Datum = 
    PoolDatum | 
    FundDatum | 
    UserDatum | 
    ScriptDatum 

//-------------------------------------------------------------

// export class Redeemer_Mint_PoolID    { 
//     plutusDataIndex = 0
//     subtypo = false 
//     constructor() {
//         console.log ("Redeemer_Mint_PoolID: " + toJson(this))
//     }
// }

//export class Redeemer_Mint_PoolID = Array <[]>

//-------------------------------------------------------------

export class Redeemer_Mint_TxID    { 
    plutusDataIndex = 0
    subtypo = true //es un subtipo de Redeemer_TxID, y necesita dos niveles de constr para serializar

    mrValidatorRedeemer : ValidatorRedeemer
    
    constructor (mrValidatorRedeemer : ValidatorRedeemer) {
        this.mrValidatorRedeemer = mrValidatorRedeemer     

        var tipo = ""
        if(mrValidatorRedeemer instanceof Redeemer_Master_Fund ){ tipo = "Redeemer_Master_Fund" }
        if(mrValidatorRedeemer instanceof Redeemer_Master_FundAndMerge ){ tipo = "Redeemer_Master_FundAndMerge" }
        if(mrValidatorRedeemer instanceof Redeemer_Master_SplitFund ){ tipo = "Redeemer_Master_SplitFund" }
        if(mrValidatorRedeemer instanceof Redeemer_Master_ClosePool ){ tipo = "Redeemer_Master_ClosePool" }
        if(mrValidatorRedeemer instanceof Redeemer_Master_TerminatePool ){ tipo = "Redeemer_Master_TerminatePool" }
        if(mrValidatorRedeemer instanceof Redeemer_Master_Emergency ){ tipo = "Redeemer_Master_Emergency" }
        if(mrValidatorRedeemer instanceof Redeemer_Master_DeleteFund ){ tipo = "Redeemer_Master_DeleteFund" }
        if(mrValidatorRedeemer instanceof Redeemer_Master_SendBackFund ){ tipo = "Redeemer_Master_SendBackFund" }
        if(mrValidatorRedeemer instanceof Redeemer_Master_SendBackDeposit ){ tipo = "Redeemer_Master_SendBackDeposit" }
        if(mrValidatorRedeemer instanceof Redeemer_Master_AddScripts ){ tipo = "Redeemer_Master_AddScripts" }
        if(mrValidatorRedeemer instanceof Redeemer_Master_DeleteScripts ){ tipo = "Redeemer_Master_DeleteScripts" }
        if(mrValidatorRedeemer instanceof Redeemer_User_Deposit ){ tipo = "Redeemer_User_Deposit" }
        if(mrValidatorRedeemer instanceof Redeemer_User_Harvest ){ tipo = "Redeemer_User_Harvest" }
        if(mrValidatorRedeemer instanceof Redeemer_User_Withdraw ){ tipo = "Redeemer_User_Withdraw" }

        console.log ("Redeemer_Mint_TxID - " + tipo + ": " + toJson(this))
    }
}

export class Redeemer_Burn_TxID { 
    plutusDataIndex = 1
    subtypo = true //es un subtipo de Redeemer_TxID, y necesita dos niveles de constr para serializar
    constructor() {
        console.log ("Redeemer_Burn_TxID: " + toJson(this))
    }
}

export type Redeemer_TxID = Redeemer_Mint_TxID | Redeemer_Burn_TxID

//-------------------------------------------------------------

export class Redeemer_Master_Fund { 
    plutusDataIndex = 1
    subtypo = true //es un subtipo de ValidatorRedeemer, y necesita dos niveles de constr para serializar

    rmfMaster : Master
    rmfStakeCredential : Maybe <StakeCredentialPubKeyHash>
    rmfFundAmount : BIGINT
    rmfMinAda : BIGINT

    constructor (
        rmfMaster : Master,
        rmfStakeCredential : Maybe <StakeCredentialPubKeyHash>,
        rmfFundAmount : BIGINT,
        rmfMinAda : BIGINT
        ) {
        this.rmfMaster = rmfMaster     
        this.rmfStakeCredential = rmfStakeCredential
        this.rmfFundAmount = rmfFundAmount     
        this.rmfMinAda = rmfMinAda     
        console.log ("Redeemer_Master_Fund: " + toJson(this))
    }
}


export class Redeemer_Master_FundAndMerge    { 
    plutusDataIndex = 2
    subtypo = true //es un subtipo de ValidatorRedeemer, y necesita dos niveles de constr para serializar
    
    rmfamMaster : Master
    rmfamStakeCredential : Maybe <StakeCredentialPubKeyHash>

    rmfamFundAmount : BIGINT
    
    constructor (
            rmfamMaster : Master, 
            rmfamStakeCredential : Maybe <StakeCredentialPubKeyHash>,
            rmfamFundAmount : BIGINT) {
        this.rmfamMaster = rmfamMaster 
        this.rmfamStakeCredential = rmfamStakeCredential
        this.rmfamFundAmount = rmfamFundAmount 
        console.log ("Redeemer_Master_FundAndMerge: " + toJson(this))
    }
}


export class Redeemer_Master_SplitFund { 
    plutusDataIndex = 3
    subtypo = true //es un subtipo de ValidatorRedeemer, y necesita dos niveles de constr para serializar
    
    rmsfMaster : Master
    rmsfStakeCredential : Maybe <StakeCredentialPubKeyHash>

    rmsfSplitFundAmount : BIGINT
    rmsfMinAda : BIGINT

    constructor (
            rmsbfMaster : Master,
            rmsfStakeCredential : Maybe <StakeCredentialPubKeyHash>,
            rmsfSplitFundAmount : BIGINT,
            rmsfMinAda : BIGINT
        ) {
        this.rmsfMaster = rmsbfMaster   
        this.rmsfStakeCredential = rmsfStakeCredential
        this.rmsfSplitFundAmount = rmsfSplitFundAmount   
        this.rmsfMinAda = rmsfMinAda   

        console.log ("Redeemer_Master_SplitFund: " + toJson(this))
    }
}


export class Redeemer_Master_ClosePool { 
    plutusDataIndex = 4
    subtypo = true //es un subtipo de ValidatorRedeemer, y necesita dos niveles de constr para serializar
    
    rmcpMaster : Master
    rmcpClosedAt : POSIXTime

    constructor (
        rmcpMaster : Master,
        rmcpClosedAt : POSIXTime
        ) {
        this.rmcpMaster = rmcpMaster     
        this.rmcpClosedAt = rmcpClosedAt     
        console.log ("Redeemer_Master_ClosePool: " + toJson(this))
    }
}


export class Redeemer_Master_TerminatePool { 
    plutusDataIndex = 5
    subtypo = true //es un subtipo de ValidatorRedeemer, y necesita dos niveles de constr para serializar
    
    rmtpMaster : Master
    constructor (rmtpMaster : Master) {
        this.rmtpMaster = rmtpMaster     
        console.log ("Redeemer_Master_TerminatePool: " + toJson(this))
    }
}

export class Redeemer_Master_Emergency { 
    plutusDataIndex = 24
    subtypo = true //es un subtipo de ValidatorRedeemer, y necesita dos niveles de constr para serializar
    
    rmeMaster : Master
    constructor (rmeMaster : Master) {
        this.rmeMaster = rmeMaster     
        console.log ("Redeemer_Master_Emergency: " + toJson(this))
    }
}

export class Redeemer_Master_DeleteFund { 
    plutusDataIndex = 6
    subtypo = true //es un subtipo de ValidatorRedeemer, y necesita dos niveles de constr para serializar
    
    rmdfMaster : Master

    constructor (rmdfMaster : Master) {
        this.rmdfMaster = rmdfMaster     
        console.log ("Redeemer_Master_DeleteFund: " + toJson(this))
    }
}

export class Redeemer_Master_SendBackFund { 
    plutusDataIndex = 7
    subtypo = true //es un subtipo de ValidatorRedeemer, y necesita dos niveles de constr para serializar
    
    rmsbfMaster : Master
    rmsbfMasterToSendBack : Master

    constructor (rmsbfMaster : Master, rmsbfMasterToSendBack : Master) {
        this.rmsbfMaster = rmsbfMaster    
        this.rmsbfMasterToSendBack = rmsbfMasterToSendBack
        console.log ("Redeemer_Master_SendBackFund: " + toJson(this))
    }
}


export class Redeemer_Master_SendBackDeposit { 
    plutusDataIndex = 8
    subtypo = true //es un subtipo de ValidatorRedeemer, y necesita dos niveles de constr para serializar
    
    rmsbdMaster : Master
    rmsbdUserToSendBack : User

    constructor (rmsbdMaster : Master, rmsbdUserToSendBack: User) {
        this.rmsbdMaster = rmsbdMaster  
        this.rmsbdUserToSendBack = rmsbdUserToSendBack
        console.log ("Redeemer_Master_SendBackDeposit: " + toJson(this))
    }
}


export class Redeemer_Master_AddScripts { 
    plutusDataIndex = 9
    subtypo = true //es un subtipo de ValidatorRedeemer, y necesita dos niveles de constr para serializar
    
    rmasMaster : Master
    rmasStakeCredential :  Maybe<StakeCredentialPubKeyHash>

    constructor (
            rmasMaster : Master, 
            rmasStakeCredential :  Maybe<StakeCredentialPubKeyHash>) {
        this.rmasMaster = rmasMaster    
        this.rmasStakeCredential = rmasStakeCredential 
        console.log ("Redeemer_Master_AddScripts: " + toJson(this))
    }
}


export class Redeemer_Master_DeleteScripts { 
    plutusDataIndex = 10
    subtypo = true //es un subtipo de ValidatorRedeemer, y necesita dos niveles de constr para serializar
    
    rmdsMaster : Master
    constructor (rmdsMaster : Master) {
        this.rmdsMaster = rmdsMaster     
        console.log ("Redeemer_Master_DeleteScripts: " + toJson(this))
    }
}


export class Redeemer_User_Deposit    { 
    plutusDataIndex = 21
    subtypo = true //es un subtipo de ValidatorRedeemer, y necesita dos niveles de constr para serializar
    
    rudUser : User 
    rudStakeCredential : Maybe<StakeCredentialPubKeyHash>
    rudInvestAmount : BIGINT
    rudCreatedAt : POSIXTime
    rudMinAda : BIGINT 
    
    constructor (
        rudUser : User,
        rudStakeCredential : Maybe<StakeCredentialPubKeyHash>,
        rudInvestAmount : BIGINT,
        rudCreatedAt : POSIXTime,
        rudMinAda : BIGINT 
        ) {
        this.rudUser = rudUser     
        this.rudStakeCredential = rudStakeCredential     
        this.rudInvestAmount = rudInvestAmount     
        this.rudCreatedAt = rudCreatedAt     
        this.rudMinAda = rudMinAda     
        console.log ("Redeemer_User_Deposit: " + toJson(this))
    }
}

export class Redeemer_User_Harvest { 
    plutusDataIndex = 22
    subtypo = true //es un subtipo de ValidatorRedeemer, y necesita dos niveles de constr para serializar
    
    ruhUser : User 
    ruhClaimAmount : BIGINT
    ruhClaimAt : POSIXTime

    constructor (
        ruhUser : User,
        ruhClaimAmount : BIGINT,
        ruhClaimAt : POSIXTime
        ) {
        this.ruhUser = ruhUser     
        this.ruhClaimAmount = ruhClaimAmount     
        this.ruhClaimAt = ruhClaimAt     
        console.log ("Redeemer_User_Harvest: " + toJson(this))
    }
}

export class Redeemer_User_Withdraw    { 
    plutusDataIndex = 23
    subtypo = true //es un subtipo de ValidatorRedeemer, y necesita dos niveles de constr para serializar
    
    ruwUser : User 
    constructor (ruwUser : User) {
        this.ruwUser = ruwUser     
        console.log ("Redeemer_User_Withdraw: " + toJson(this))
    }
}


export type ValidatorRedeemer = 
    Redeemer_Master_Fund |
    Redeemer_Master_FundAndMerge |
    Redeemer_Master_SplitFund |
    Redeemer_Master_ClosePool |
    Redeemer_Master_TerminatePool |
    Redeemer_Master_Emergency |
    Redeemer_Master_DeleteFund |
    Redeemer_Master_SendBackFund |
    Redeemer_Master_SendBackDeposit |
    Redeemer_Master_AddScripts |
    Redeemer_Master_DeleteScripts |
    Redeemer_User_Deposit |
    Redeemer_User_Harvest |
    Redeemer_User_Withdraw

//-------------------------------------------------------------

