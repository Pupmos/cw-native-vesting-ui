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
  Spacer,
  Stack,
  StackItem,
  useToast,
} from "@chakra-ui/react";
import { ButtonShape } from "@cosmology-ui/utils";
import { useChain } from "@cosmos-kit/react";
import Decimal from "decimal.js";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { ConnectWalletButton } from "../../components";
import { chainName, cwVestingCodeId } from "../../config";

export default function ContractAddressPage() {
  const router = useRouter();
  const contractAddress = router.query.address as string;
  const chain = useChain(chainName);
  const { address, status, getCosmWasmClient, getSigningCosmWasmClient } =
    chain;
  // /// Response for CanExecute query
  // #[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, JsonSchema)]
  // pub struct CanExecuteResponse {
  //     pub can_execute: bool,
  // }

  // /// Response for AccountInfo query
  // #[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, JsonSchema)]
  // pub struct AccountInfoResponse {
  //     pub recipient: Addr,
  //     pub operator: Addr,
  //     pub oversight: Addr,
  //     /// Timestamps for current discrete or continuous vesting plan
  //     pub vesting_plan: VestingPlan,
  // }

  // /// Response for TokenInfo query
  // #[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, JsonSchema)]
  // pub struct TokenInfoResponse {
  //     pub denom: String,
  //     /// Initial amount of vested tokens
  //     pub initial: Uint128,
  //     /// Amount of currently frozen tokens
  //     pub frozen: Uint128,
  //     /// Amount of tokens that has been paid so far
  //     pub released: Uint128,
  //     /// Amount of all tokens from current contract
  //     pub balance: Uint128,
  // }

  // /// Response for IsLiberated query
  // #[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, JsonSchema)]
  // pub struct IsHandedOverResponse {
  //     /// Does this account completed hand over procedure and thus achieved
  //     /// "liberated" status
  //     pub is_handed_over: bool,
  // }
  // #[derive(Serialize, Deserialize, Clone, PartialEq, Eq, JsonSchema, Debug)]
  // #[serde(rename_all = "snake_case")]
  // pub enum ExecuteMsg {
  //     /// Execute regular messages allowing to use vesting account as fully
  //     /// functional "proxy account"
  //     Execute {
  //         msgs: Vec<CosmosMsg>,
  //     },
  //     ReleaseTokens {
  //         amount: Option<Uint128>,
  //     },
  //     /// If the recipient violates a contractual agreement, he may get find his
  //     /// tokens frozen
  //     FreezeTokens {
  //         amount: Option<Uint128>,
  //     },
  //     UnfreezeTokens {
  //         amount: Option<Uint128>,
  //     },

  //     // TODO: Add Bond/Unbond implementations
  //     Bond {},
  //     Unbond {
  //         amount: Uint128,
  //     },

  //     /// Oversight is able to change the operator'a account address.
  //     ChangeOperator {
  //         address: Addr,
  //     },
  //     /// Once end time of the contract has passed, hand over can be performed.
  //     /// It will burn all frozen tokens and set Oversight and Operator's addresses
  //     /// to the Reciepient's key. This marks the contract as Liberated
  //     HandOver {},
  // }

  // Details: Calculating Tokens that can be Released
  // When calculating tokens that can be released, we use the following equations:

  // Available tokens = Vested Tokens - Released Tokens - Frozen Tokens
  // If t >= end_time, Vested Tokens = Balance(contract) + Released Tokens
  // this handles case where more tokens were sent to contract later, and just keeps the frozen tokens frozen
  // If start_time >= t, Vested Tokens = 0
  // If start_time < t < end_time, Vested Tokens = InitialBalance * (t - start_time) / (end_time - start_time)

  const canExecuteContractQuery = useQuery(
    ["can-execute-contract", address],
    async () => {
      if (!address) return;
      const client = await getCosmWasmClient();
      const res = await client.queryContractSmart(contractAddress, {
        can_execute: { sender: address },
      });
      console.log(res);
      return res;
    }
  );
  const accountInfoContractQuery = useQuery(
    ["account-info-contract"],
    async () => {
      const client = await getCosmWasmClient();
      const res = await client.queryContractSmart(contractAddress, {
        account_info: {},
      });
      return res;
    }
  );
  const tokenInfoContractQuery = useQuery(["token-info-contract"], async () => {
    const client = await getCosmWasmClient();
    const res = await client.queryContractSmart(contractAddress, {
      token_info: {},
    });
    console.log(res);
    return res;
  });
  const isHandedOverContractQuery = useQuery(
    ["is-handed-over-contract"],
    async () => {
      const client = await getCosmWasmClient();
      const res = await client.queryContractSmart(contractAddress, {
        is_handed_over: {},
      });
      return res;
    }
  );
  const vestingContractQuery = useQuery(
    ["vesting-contract", contractAddress],
    async () => {
      const client = await getCosmWasmClient();
      const contract = await client.getContract(contractAddress);
      return contract;
    }
  );
  const contractBalance = useQuery(
    ["contract-balance", contractAddress],
    async () => {
      const client = await getCosmWasmClient();
      const balance = await client.getBalance(contractAddress, "ujuno");
      return balance;
    }
  );

  const releasableTokens = useMemo(() => {
    if (
      !tokenInfoContractQuery.data ||
      !accountInfoContractQuery.data ||
      !vestingContractQuery.data
    ) {
      return null;
    }
    let { initial, frozen, released } = tokenInfoContractQuery.data;
    // convert to decimals
    const { vesting_plan } = accountInfoContractQuery.data;
    const { end_at, start_at } = vesting_plan.Continuous;

    const releasable = new Decimal(initial)
      .mul(
        new Decimal(Date.now())
          .mul(1000000)
          .sub(start_at)
          .div(new Decimal(end_at).sub(start_at))
      )
      .sub(released)
      .sub(frozen)
      .floor()
      .toString();
    return releasable;
  }, [
    tokenInfoContractQuery.data,
    accountInfoContractQuery.data,
    vestingContractQuery.data,
  ]);

  type ExecuteMsg = {
    release_tokens: {
      amount: string;
    };
  };

  // chakra toast
  const toast = useToast();
  const querier = useQueryClient();
  // react-query cosmwasm mutations for all executemsgs
  const executeContractMutation = useMutation(
    async (executeMsg: ExecuteMsg) => {
      const client = await getSigningCosmWasmClient();
      const res = await client.execute(address!, contractAddress, executeMsg, {
        gas: "2000000",
        amount: [{ denom: "ujuno", amount: "10000000" }],
      });
      return res;
    },
    {
      onSuccess: () => {
        querier.invalidateQueries(["account-info-contract"]);
        querier.invalidateQueries(["token-info-contract"]);
        querier.invalidateQueries(["is-handed-over-contract"]);
        querier.invalidateQueries(["contract-balance", contractAddress]);
        querier.invalidateQueries(["can-execute-contract", address]);
        querier.invalidateQueries(["vesting-contract", contractAddress]);

        //  charkra toast
        toast({
          title: "Success",
          description: "Contract executed",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      },
    }
  );

  return (
    <Box p={4}>
      <Heading as="h1" size="lg" mb={4}>
        {vestingContractQuery.data?.label || "loading..."}
      </Heading>
      {/* ACTIONS (EXECUTE MSGS) */}

      <Stack spacing={4}>
        {/* releaseable tokens */}
        <StackItem>
          <Heading as="h2" size="md" mb={4}>
            Releasable Tokens
          </Heading>
          <Code>{releasableTokens?.toString() || "loading..."}</Code>
          <Spacer></Spacer>
          <Button
            onClick={() => {
              executeContractMutation.mutate({
                release_tokens: {
                  amount: releasableTokens?.toString() || "0",
                },
              });
            }}
            isLoading={executeContractMutation.isLoading}
            colorScheme="green"
            mt={4}
          >
            Release Tokens
          </Button>
        </StackItem>
        {/* show the user whether they can execute the contract in a visually attractive way */}
        <StackItem>
          <Heading as="h2" size="md" mb={4}>
            Can Execute
          </Heading>
          <Code>
            {JSON.stringify(canExecuteContractQuery.data) || "loading..."}
          </Code>
          <Code>{JSON.stringify(canExecuteContractQuery.data)}</Code>
        </StackItem>

        {/* show the user the account info in a visually attractive way */}
        <StackItem>
          <Heading as="h2" size="md" mb={4}>
            Account Info
          </Heading>
          <Stack spacing={4}>
            <StackItem>
              <Heading as="h3" size="sm" mb={4}>
                Recipient
              </Heading>
              <Code>
                {accountInfoContractQuery.data?.recipient || "loading..."}
              </Code>
            </StackItem>
            <StackItem>
              <Heading as="h3" size="sm" mb={4}>
                Operator
              </Heading>
              <Code>
                {accountInfoContractQuery.data?.operator || "loading..."}
              </Code>
            </StackItem>
            <StackItem>
              <Heading as="h3" size="sm" mb={4}>
                Oversight
              </Heading>
              <Code>
                {accountInfoContractQuery.data?.oversight || "loading..."}
              </Code>
            </StackItem>
            <StackItem>
              <Heading as="h3" size="sm" mb={4}>
                Vesting Plan
              </Heading>
              {/* show nanosecond time of accountInfoContractQuery.data?.vesting_plan.start_at and accountInfoContractQuery.data?.vesting_plan.end_at as locale date times */}
              <Code>
                {new Date(
                  accountInfoContractQuery.data?.vesting_plan.Continuous
                    .start_at / 1000000
                ).toLocaleString()}
              </Code>
              -
              <Code>
                {new Date(
                  accountInfoContractQuery.data?.vesting_plan.Continuous
                    .end_at / 1000000
                ).toLocaleString()}
              </Code>
            </StackItem>
          </Stack>
        </StackItem>
        <StackItem>
          <Heading as="h2" size="md" mb={4}>
            Token Info
          </Heading>
          <Stack spacing={4}>
            <StackItem>
              <Heading as="h3" size="sm" mb={4}>
                Denom
              </Heading>
              <Code>{tokenInfoContractQuery.data?.denom || "loading..."}</Code>
            </StackItem>
            <StackItem>
              <Heading as="h3" size="sm" mb={4}>
                Initial
              </Heading>
              <Code>
                {tokenInfoContractQuery.data?.initial?.toString() ||
                  "loading..."}
              </Code>
            </StackItem>
            <StackItem>
              <Heading as="h3" size="sm" mb={4}>
                Released
              </Heading>
              <Code>
                {tokenInfoContractQuery.data?.released?.toString() ||
                  "loading..."}
              </Code>
            </StackItem>
            <StackItem>
              <Heading as="h3" size="sm" mb={4}>
                Remaining
              </Heading>
              <Code>
                {tokenInfoContractQuery.data?.balance?.toString() ||
                  "loading..."}
              </Code>
            </StackItem>
            {/* raw data */}
            <StackItem>
              <Heading as="h3" size="sm" mb={4}>
                Raw Data
              </Heading>
              <Code>
                {JSON.stringify(tokenInfoContractQuery.data) || "loading..."}
              </Code>
            </StackItem>
          </Stack>
        </StackItem>

        <StackItem>
          <Heading as="h2" size="md" mb={4}>
            Is Handed Over
          </Heading>
          <Code>
            {JSON.stringify(isHandedOverContractQuery.data) || "loading..."}
          </Code>
        </StackItem>

        <StackItem>
          <Heading as="h2" size="md" mb={4}>
            Contract Address
          </Heading>
          <Code>{contractAddress}</Code>
        </StackItem>
        <StackItem>
          <Heading as="h2" size="md" mb={4}>
            Contract Info
          </Heading>
          <Stack spacing={4}>
            <StackItem>
              <Heading as="h3" size="sm" mb={4}>
                Label
              </Heading>
              <Code>{vestingContractQuery.data?.label || "loading..."}</Code>
            </StackItem>
            <StackItem>
              <Heading as="h3" size="sm" mb={4}>
                Creator
              </Heading>
              <Code>{vestingContractQuery.data?.creator || "loading..."}</Code>
            </StackItem>
            <StackItem>
              <Heading as="h3" size="sm" mb={4}>
                Code ID
              </Heading>
              <Code>{vestingContractQuery.data?.codeId || "loading..."}</Code>
            </StackItem>
          </Stack>
        </StackItem>
      </Stack>
    </Box>
  );
}
