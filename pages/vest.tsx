import {
  Box,
  Button,
  Code,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  Stack,
  StackItem,
} from "@chakra-ui/react";
import { ButtonShape } from "@cosmology-ui/utils";
import { useChain } from "@cosmos-kit/react";
import Link from "next/link";
import { useMemo, useState } from 'react';
import { useQuery } from "react-query";
import { ConnectWalletButton } from "../components";
import { chainName, cwVestingCodeId } from "../config";

// address validation function using cosmjs
import { fromBech32 } from "@cosmjs/encoding";

function isValidAddress(address: string): boolean {
  try {
    fromBech32(address);
    return true;
  } catch (e) {
    return false;
  }
}


let d = new Date();
const datetimeLocalNow = (new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString()).slice(0, -1);
d = new Date(d.getTime() + 1000 * 60 * 60 * 24 * 7);
const datetimeLocalLater = (new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString()).slice(0, -1);
export default function VestingContracts() {
  const {
    getSigningStargateClient,
    address,
    status,
    getRpcEndpoint,
    getCosmWasmClient,
  } = useChain(chainName);

  const vestingContractsQuery = useQuery("vesting-contracts", async () => {
    const client = await getCosmWasmClient();
    const contractAddrs = await client.getContracts(cwVestingCodeId);
    const contracts = await Promise.all(
      contractAddrs.map(async (addr) => {
        const contract = await client.getContract(addr);
        return contract;
      })
    );
    return contracts;
  });
  const [instantiateMsgDraft, setInstantiateMsgDraft] = useState({
    start_time: datetimeLocalNow,
    end_time: datetimeLocalLater,
    amount: "",
    recipient: '',
    operator: '',
    oversight: '',
  });
  const instantiateMsg = useMemo(() => {
    return {
      "denom": "ujuno",
      // Recipient - this is the account that receives the tokens once they have been vested and released. This cannot be changed. Tokens not released for whatever reason will be effectively burned, so SOB cannot repurpose them.
      "recipient": "",
      // Operator - this is either the validator or an optional delegation to an "operational" employee from SOB, which can approve the payout of fully vested tokens to the final recipient. They cannot do anything else
      "operator": "",
      // Oversight - this is a secure multi-sig from SOB, which can be used in extraordinary circumstances, to change the Operator, or to halt the release of future tokens in the case of misbehaviour.
      "oversight": "",
      "vesting_plan": {
        "Continuous": {
          // in nanoseconds
          "start_at": new Date(instantiateMsgDraft.start_time).getTime() * 1000000,
          // in nanoseconds
          "end_at": new Date(instantiateMsgDraft.end_time).getTime() * 1000000,
        }
      }
    }
  }, [instantiateMsgDraft.amount, instantiateMsgDraft.start_time, instantiateMsgDraft.end_time]);
  return (
    <Box w={"full"}>
      <Heading ml={6} as="h2" size="xl">
        Create Vesting Contract
      </Heading>
      
      <Stack mt={16} ml={10}>
        <FormControl isRequired>
          <FormLabel>Amount</FormLabel>
          <Input
            min={0}
            placeholder="Amount (juno)"
            size="md"
            type="number"
            value={instantiateMsgDraft.amount}
            onChange={(e) => setInstantiateMsgDraft({ ...instantiateMsgDraft, amount: e.target.value })}
          />
          <FormHelperText>
            Amount of tokens to be vested.
          </FormHelperText>
        </FormControl>
        <FormControl isRequired>
          <FormLabel>Start Date</FormLabel>
          <Input
            placeholder="Start Date (local time)"
            size="md"
            type="datetime-local"
            value={instantiateMsgDraft.start_time}
            onChange={(e) => setInstantiateMsgDraft({ ...instantiateMsgDraft, start_time: e.target.value })}
          />
          <FormHelperText>
            Start Date
          </FormHelperText>
        </FormControl>
        <FormControl isRequired>
          <FormLabel>End Date</FormLabel>
          <Input
            placeholder="End Date (local time)"
            size="md"
            type="datetime-local"
            value={instantiateMsgDraft.end_time}
            onChange={(e) => setInstantiateMsgDraft({ ...instantiateMsgDraft, end_time: e.target.value })}
          />
          <FormHelperText>
            End Date
          </FormHelperText>
        </FormControl>
        <FormControl isInvalid={!!instantiateMsgDraft.recipient && !isValidAddress(
          instantiateMsgDraft.recipient
        )} isRequired>
          <FormLabel>Recipient</FormLabel>
          <Input
            placeholder="Recipient"
            size="md"
            type="text"
            value={instantiateMsgDraft.recipient}
            onChange={(e) => setInstantiateMsgDraft({ ...instantiateMsgDraft, recipient: e.target.value })}
          />
          <FormHelperText>
            This is the account that receives the tokens once they have been vested and released. This cannot be changed. Tokens not released for whatever reason will be effectively burned, so SOB cannot repurpose them.
          </FormHelperText>
        </FormControl>
        <FormControl isRequired
          isInvalid={!!instantiateMsgDraft.operator && !isValidAddress(
            instantiateMsgDraft.operator
          )}
        >  
          <FormLabel>Operator</FormLabel>
          <Input
            placeholder="Operator"
            size="md"
            type="text"
            value={instantiateMsgDraft.operator}
            onChange={(e) => setInstantiateMsgDraft({ ...instantiateMsgDraft, operator: e.target.value })}
          />
        </FormControl>
        <FormControl isRequired 
          isInvalid={!!instantiateMsgDraft.oversight && !isValidAddress(
            instantiateMsgDraft.oversight
          )}
        >
          <FormLabel>Oversight</FormLabel>
          <Input
            placeholder="Oversight"
            size="md"
            type="text"
            value={instantiateMsgDraft.oversight}
            onChange={(e) => setInstantiateMsgDraft({ ...instantiateMsgDraft, oversight: e.target.value })}
          />
          <FormHelperText>
            This is a secure multi-sig from SOB, which can be used in extraordinary circumstances, to change the Operator, or to halt the release of future tokens in the case of misbehaviour.
          </FormHelperText>
        </FormControl>
      


        <Button
          w="full"
          minW="fit-content"
          size="lg"
          // isLoading={isLoading}
          // isDisabled={isDisabled}
          bgImage="linear-gradient(109.6deg, rgba(157,75,199,1) 11.2%, rgba(119,81,204,1) 83.1%)"
          color="white"
          opacity={1}
          transition="all .5s ease-in-out"
          _hover={{
            bgImage:
              "linear-gradient(109.6deg, rgba(157,75,199,1) 11.2%, rgba(119,81,204,1) 83.1%)",
            opacity: 0.75,
          }}
          _active={{
            bgImage:
              "linear-gradient(109.6deg, rgba(157,75,199,1) 11.2%, rgba(119,81,204,1) 83.1%)",
            opacity: 0.9,
          }}
          // onClick={onClickConnectBtn}
        >
          {/* <Icon as={icon ? icon : IoWallet} mr={2} /> */}
          {/* {buttonText ? buttonText : 'Connect Wallet'} */}
          Create Vesting Contract
        </Button>
        <Code>
          <pre>

          {JSON.stringify(instantiateMsgDraft, null, 2)}
          {JSON.stringify(instantiateMsg, null, 2)}
          </pre>
        </Code>

      </Stack>
    </Box>
  );
}