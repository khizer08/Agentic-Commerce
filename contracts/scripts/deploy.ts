import * as algokit from '@algorandfoundation/algokit-utils';
import algosdk from "algosdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  OTC Trustless Swap — RAW DEPLOYMENT");
  console.log("═══════════════════════════════════════════════");

  const algod = new algosdk.Algodv2(
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "http://localhost",
    4001
  );

  const kmd = new algosdk.Kmd(
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "http://localhost",
    4002
  );

  const deployer = await algokit.getLocalNetDispenserAccount(algod, kmd);
  console.log(`\n✔ Deployer: ${deployer.addr}`);

  const approvalPath = path.join(__dirname, "../artifacts/DealRegistry.approval.teal");
  const clearPath = path.join(__dirname, "../artifacts/DealRegistry.clear.teal");

  const approvalTeal = fs.readFileSync(approvalPath, "utf8");
  const clearTeal = fs.readFileSync(clearPath, "utf8");

  console.log("\n⏳ Compiling and Deploying...");

  const compiledApproval = await algod.compile(approvalTeal).do();
  const compiledClear = await algod.compile(clearTeal).do();

  const params = await algod.getTransactionParams().do();

  // ✅ EXACT ABI METHOD
  const method = new algosdk.ABIMethod({
    name: "createApplication",
    args: [],
    returns: { type: "void" },
  });

  const selector = method.getSelector(); // 🔥 THIS is what your TEAL expects

  const txn = algosdk.makeApplicationCreateTxnFromObject({
    from: deployer.addr,
    suggestedParams: params,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,

    // ✅ CRITICAL FIX
    appArgs: [selector],

    approvalProgram: new Uint8Array(Buffer.from(compiledApproval.result, "base64")),
    clearProgram: new Uint8Array(Buffer.from(compiledClear.result, "base64")),

    numLocalInts: 0,
    numLocalByteSlices: 0,
    numGlobalInts: 5,
    numGlobalByteSlices: 2,
  });

  const signedTxn = txn.signTxn(deployer.sk);
  const { txId } = await algod.sendRawTransaction(signedTxn).do();

  console.log(`\n⏳ Transaction sent: ${txId}`);

  const result = await algosdk.waitForConfirmation(algod, txId, 4);
  const appId = result["application-index"];

  console.log("\n✅ DEPLOYMENT SUCCESSFUL!");
  console.log(`🚀 App ID: ${appId}`);

  console.log("\n═══════════════════════════════════════════════");
  console.log(`NEXT_PUBLIC_APP_ID=${appId}`);
  console.log("═══════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("\n✖ Deployment failed:", err);
  process.exit(1);
});