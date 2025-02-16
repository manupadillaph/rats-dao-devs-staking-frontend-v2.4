import type { NextApiRequest, NextApiResponse } from 'next';
import { connect } from '../../utils/dbConnect';
import { exec } from 'child_process';
import { toJson } from '../../utils/utils';
import { MintingPolicy, SpendingValidator } from 'lucid-cardano';
import { getSession } from 'next-auth/react';
import { crearFileListForZip, crearStakingPoolFromFiles, createMainJsonFile, getEstadoDeployFromFile, getPABPoolParamsFromFile } from "../../stakePool/helpersServerSide";
import { CurrencySymbol, PoolParamsV1 } from '../../types';
import { maxMasters } from '../../types/constantes';
import { getStakingPoolDBModel, getStakingPoolFromDBByName, StakingPoolDBInterface } from '../../types/stakePoolDBModel';
import { getScriptFromFile, getTextFromFile, rmdir } from '../../utils/utilsServerSide';
import path from 'path';
import * as yup from "yup";
import { setLocale } from 'yup';

const fs = require('fs/promises');

type Data = {
	msg: string
}

setLocale({
	mixed: {
		notType: '${label} is not a valid ${type}',

	},
  });

// let formSchema = yup.object().shape({
// 	username: yup.string().required().label("Your Name"),
// 	email: yup.string().email().required().label("Your Email"),
// 	nombrePool: yup.string().required().label("Pool Name"),
// 	image: yup.string().url().required().label("Pool Image"),
// 	masters: yup.string().matches(/^[a-f0-9]{56}(,[a-f0-9]{56})*$/, "${label} must be a list of comma-separated strings, each consisting of 56 hexadecimal characters").required().label("Masters"),
// 	poolID_TxOutRef: yup.string().matches(/^[a-f0-9]{64}\#[0-9]+$/, "${label} must be a string consisting of 64 hexadecimal characters for the transaction hash, followed by a '#' symbol and the output index")
// 	  .required().label("UTxO for minting NFT PoolID"),
// 	beginAt: yup.number().required().label("Begin at"),
// 	deadline: yup.number().required().label("Deadline"),
// 	graceTime: yup.number().required().label("Grace time"),
// 	staking_UI: yup.string().required().label("Staking UI"),
// 	staking_CS: yup.string().matches(/^[a-f0-9]{56}$/,{message: "${label} must be a string consisting of 56 hexadecimal characters", excludeEmptyString: true}).label("Staking Currency Symbol"),
// 	staking_TN: yup.string().matches(/^([a-f0-9]{2})+$/,{message: "${label} must be a string consisting of pairs of hexadecimal characters", excludeEmptyString: true}).label("Staking Token Name"),
// 	harvest_UI: yup.string().required().label("Harvest UI"),
// 	harvest_CS: yup.string().matches(/^[a-f0-9]{56}$/,{message: "${label} must be a string consisting of 56 hexadecimal characters", excludeEmptyString: true}).label("Harvest Currency Symbol"),
// 	harvest_TN: yup.string().matches(/^([a-f0-9]{2})+$/, {message: "${label} must be a string consisting of pairs of hexadecimal characters", excludeEmptyString: true}).label("Harvest Token Name"),
// 	staking_Decimals: yup.number().min(0).max(6).required().label("Staking Decimals"),
// 	harvest_Decimals: yup.number().min(0).max(6).required().label("Harvest Decimals"),
// 	interest: yup.number().required().label("Annual pay of Harvest Unit per each Staking Unit")
//   });

let formSchema = yup.object().shape({
	interest: yup.string().matches(/^(\d+:\d+:\d+,)*:\d+:\d+$/, {message: "You must fill all items in ${label}", excludeEmptyString: true}).label("Annual pay of Harvest Unit per Staking Unit"),
	// interest: yup.number().min(0).required().label("Annual pay of Harvest Unit per each Staking Unit"),
	harvest_Decimals: yup.number().min(0).max(6).required().label("Harvest Decimals"),
	harvest_TN: yup.string().matches(/^([a-f0-9]{2})+$/, {message: "${label} must be a string consisting of pairs of hexadecimal characters", excludeEmptyString: true}).label("Harvest Token Name"),
	harvest_CS: yup.string().matches(/^[a-f0-9]{56}$/,{message: "${label} must be a string consisting of 56 hexadecimal characters", excludeEmptyString: true}).label("Harvest Currency Symbol"),
	harvest_UI: yup.string().required().label("Harvest UI"),
	staking_Decimals: yup.number().min(0).max(6).required().label("Staking Decimals"),
	staking_TN: yup.string().matches(/^([a-f0-9]{2})+$/,{message: "${label} must be a string consisting of pairs of hexadecimal characters", excludeEmptyString: true}).label("Staking Token Name"),
	staking_CS: yup.string().matches(/^[a-f0-9]{56}$/,{message: "${label} must be a string consisting of 56 hexadecimal characters", excludeEmptyString: true}).label("Staking Currency Symbol"),
	staking_UI: yup.string().required().label("Staking UI"),
	graceTime: yup.number().min(0).required().label("Grace time"),
	deadline: yup.number().min(0).required().label("Deadline"),
	beginAt: yup.number().min(0).required().label("Begin at"),
	poolID_TxOutRef: yup.string().matches(/^[a-f0-9]{64}\#[0-9]+$/, "${label} must be a string consisting of 64 hexadecimal characters for the transaction hash, followed by a '#' symbol and the output index")
	  .required().label("UTxO for minting NFT PoolID"),
	masters: yup.string().matches(/^[a-f0-9]{56}(,[a-f0-9]{56})*$/, "${label} must be a list of comma-separated strings, each consisting of 56 hexadecimal characters").required().label("Masters"),
	image: yup.string().url().required().label("Pool Image"),
	nombrePool: yup.string().required().label("Pool Name"),
	// email: yup.string().email().required().label("Your Email"),
	// username: yup.string().required().label("Your Name"),
});

export default async function handler( req: NextApiRequest, res: NextApiResponse<Data | string>) {

	try {
		//--------------------------------
		const session = await getSession({ req })
		if (!session) {
			throw "Must Connect to your Wallet"
		}
		const sesionPkh = session?.user.pkh
		//--------------------------------
		if (!(session?.user.swRatsDAOCreator)){
			throw "You Can't Create Staking Pool"
		}
		//--------------------------------

		const nombrePool = (req.body.nombrePool as string).trim()
		const image = (req.body.image as string).trim()

		const swCreate = req.body.swCreate 
		const swAdd = req.body.swAdd 
		const swDownload = req.body.swDownload 

		const masters = (req.body.masters as string).trim()
		const poolID_TxOutRef = (req.body.poolID_TxOutRef as string).trim()
		const beginAt = (req.body.beginAt as string).trim()
		const deadline = (req.body.deadline as string).trim()
		const graceTime = (req.body.graceTime as string).trim()
		const staking_UI = (req.body.staking_UI as string).trim()
		const staking_CS = (req.body.staking_CS as string).trim()
		const staking_TN = (req.body.staking_TN as string).trim()
		const harvest_UI = (req.body.harvest_UI as string).trim()
		const harvest_CS = (req.body.harvest_CS as string).trim()
		const harvest_TN = (req.body.harvest_TN as string).trim()

		const staking_Decimals = (req.body.staking_Decimals as string).trim()
		const harvest_Decimals = (req.body.harvest_Decimals as string).trim()

		const interest = (req.body.interest as string).trim()

		const ruta = process.env.REACT_SERVER_PATH_FOR_SCRIPTS

		await connect();

		console.log("/api/createStakingPool-init - Request: " + toJson(req.body));
		// console.log("/api/createStakingPool-init - Ruta: " + ruta);

		try {
			await formSchema.validate(req.body);
		} catch (error) {
			throw error
		}
		
		const stakingPoolWithSameName = await getStakingPoolFromDBByName (nombrePool)
		
		if (stakingPoolWithSameName.length> 0 && swAdd){
			throw "Can't add to Pool with existing name"
		}

		const mastersSplited = masters.split(',');

		if (masters.length == 0 ){
			throw "Can't create Pool with no masters"
		}

		if (mastersSplited.length> maxMasters ){
			throw "Can't create Pool with so many masters"
		}
		
		if (deadline < beginAt ){
			throw "Deadline must be greater than begin at"
		}
		
		if (staking_CS == "" && staking_TN != "" ){
			throw "Staking Token Name can't be set if Staking Currency Symbol is empty"	
		}

		if (harvest_CS == "" && harvest_TN != "" ){
			throw "Harvest Token Name can't be set if Harvest Currency Symbol is empty"	
		}

		if (harvest_CS != "" && harvest_TN == "" ){
			throw "Harvest Token Name must be set if Harvest Currency Symbol is not empty"	
		}

		//--------------------------------

		const interestRates = interest.split(",").map((interest:any) => {
			const [iMinDays, iStaking, iHarvest] = interest.split(":");
			return {
				iMinDays: Number (iMinDays),
				iStaking: Number (iStaking),
				iHarvest: Number (iHarvest),
			};
		})
		
		//--------------------------------

		let iMinDaysPrev: number | undefined = undefined;
		let iHarvestStakingRatioPrev: number | undefined = undefined;
		let isValid = true;
		interestRates.forEach((interestRate: any) => {
			// console.log ("TE:",interestRate.iMinDays)
			if (iMinDaysPrev !== undefined && interestRate.iMinDays && interestRate.iMinDays <= iMinDaysPrev) {
				isValid = false;
				return;
			}
			
			const iHarvestStakingRatio = interestRate.iHarvest / interestRate.iStaking;
			if (iHarvestStakingRatioPrev !== undefined && iHarvestStakingRatio < iHarvestStakingRatioPrev) {
				isValid = false;
				return;
			}
			
			iMinDaysPrev = interestRate.iMinDays;
			iHarvestStakingRatioPrev = iHarvestStakingRatio;
		});
	
		if (!isValid){
			throw "Interest rates are not valid, must be Min Days and Harvest / Staking ratio in ascending order"
		}

		//--------------------------------

		if (swCreate){
			const rutaPool = path.join(process.env.REACT_SERVER_PATH_FOR_SCRIPTS!, nombrePool);
			await rmdir (rutaPool)
		}

		if (swCreate){
			const execDeploy = 'deploy \"' + nombrePool + '\" \"' + masters + '\" \"' + poolID_TxOutRef + '\" \"' + beginAt + '\" \"' + deadline + '\" \"' + graceTime + '\" \"' + staking_UI + '\" \"' + staking_CS + '\" \"' + staking_TN + '\" \"' + harvest_UI + '\" \"' + harvest_CS + '\" \"' + harvest_TN + '\" \"' + interest + '\" \"' +  ruta + '\"' 
			console.log("/api/createStakingPool-init - exec: \r\n" + execDeploy)
			
			exec(execDeploy, async (error, stdout, stderr) => {
				console.log("/api/createStakingPool-init - exec - stdout: " + stdout );
				if (error) {
					// var errorStr = toJson(stderr)
					// errorStr = errorStr.indexOf("CallStack") > -1 ? errorStr.slice(7,errorStr.indexOf("CallStack")-2) : errorStr  
					// // throw "There were an error creating Smart Contracts: " + errorStr
					// const error = "There were an error creating Smart Contracts: " + errorStr
					// console.error("/api/createStakingPool-init - Error: " + error);
					// res.status(400).json({ msg: error });
					// swError = true
					// return ;
				}else {
					// res.status(200).json({ msg: "Creating Smart Contracts..." });
					// return
					// ya di salida, no me quede esperando a que termine
				}
			})
			
			// no hay control de que pasa con la ejecucion del script
			// la ejecucion comienza... y luego solo queda leer el estado del archivo de salida
			// quiero que esta llamada api regrese cuanto antes

			res.status(200).json({ msg: "Creating Smart Contracts..." });
			return

		}else{
			res.status(200).json({ msg: "Creating Smart Contracts..." });
			return
		}
	} catch (error: any) {
		console.error("/api/createStakingPool-init - Error: " + error);
		res.status(400).json({ msg: error });
		return;
	}
}

