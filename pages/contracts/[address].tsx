import {
  Box,
  Button,
  Code,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  Heading,
  HStack,
  Input,
  Select,
  Spacer,
  Stack,
  StackItem,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
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
import { chainName, cwVestingCodeIds } from "../../config";

export default function ContractAddressPage() {
  const router = useRouter();
  const contractAddress = router.query.address as string;
  const chain = useChain(chainName);
  const {
    address,
    status,
    getCosmWasmClient,
    getSigningCosmWasmClient,
    getStargateClient,
    getRestEndpoint,
  } = chain;
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
    async (): Promise<{
      recipient: string;
      operator: string;
      oversight: string;
      vesting_plan: {
        Continuous: {
          start_at: string;
          end_at: string;
        };
      };
    }> => {
      const client = await getCosmWasmClient();
      const res = await client.queryContractSmart(contractAddress, {
        account_info: {},
      });
      return res;
    }
  );
  const tokenInfoContractQuery = useQuery(
    ["token-info-contract"],
    async (): Promise<{
      denom: string;
      initial: string;
      frozen: string;
      released: string;
      balance: string;
    }> => {
      const client = await getCosmWasmClient();
      const res = await client.queryContractSmart(contractAddress, {
        token_info: {},
      });
      console.log(res);
      return res;
    }
  );
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

  const humanReadableReleasableTokens = useMemo(() => {
    if (!releasableTokens) return "";
    return new Decimal(releasableTokens).div(1000000).toString() + " JUNO";
  }, [releasableTokens]);

  const withdrawableDelegatorRewards = useQuery(
    ["withdrawable-delegator-rewards", contractAddress],
    async () => {
      if (!contractAddress) return;
      const res = await fetch(
        `${await getRestEndpoint()}/cosmos/distribution/v1beta1/delegators/${contractAddress}/rewards`
      );
      const data = await res.json();
      return data.total.find((t: any) => t.denom === "ujuno")?.amount as string;
    }
  );

  const totalStakeQuery = useQuery(["total-stake"], async () => {
    const client = await getStargateClient();
    const bal = await client.getBalanceStaked(contractAddress);
    if (!bal) return "0";
    return bal.amount;
  });

  // rest query for all validators
  const validatorsQuery = useQuery(["validators"], async () => {
    // load from cosmos directory 
    const res = await fetch(
      `https://validators.cosmos.directory`
    );
    const data = await res.json() as {
      repository: {
        url: string
        branch: string
        commit: string
        timestamp: number
      }
      validators: Array<{
        path: string
        name: string
        identity?: string
        total_usd: number
        total_users: number
        chains: Array<{
          name: string
          moniker?: string
          identity?: string
          address: string
          active?: boolean
          jailed?: boolean
          status?: string
          delegations?: {
            total_tokens?: string
            total_count?: number
            total_tokens_display?: number
            total_usd?: number
          }
          description?: {
            moniker: string
            identity: string
            website: string
            security_contact: string
            details: string
          }
          commission?: {
            rate: number
          }
          rank?: number
          slashes?: Array<{
            validator_period: string
            fraction: string
          }>
          image?: string
          restake?: {
            address: string
            run_time: any
            minimum_reward: number
          }
          missed_blocks_periods?: Array<{
            blocks: number
            missed: number
          }>
        }>
        profile: {
          $schema?: string
          name: string
          identity?: string
          website?: string
          description?: {
            overview: string
            team?: string
            security?: string
          }
          contacts?: {
            telephone?: string
            email?: string
            telegram?: string
            twitter?: string
            discord?: string
            others?: {
              emergency: string
            }
          }
          details?: string
          "security-contact"?: string
          apps?: Array<string>
          twitter?: string
        }
        services?: Array<{
          title: string
          description?: string
          url: string
          image?: string
        }>
      }>
    }
    
    const vals = data.validators.flatMap((v) => v.chains.filter(c => c.name === "juno"));
  
    const uniquesDict: Record<string, boolean> = {};
    // sort by case insensitive moniker then filter out jailed then use a reducer to ensure all validator addresss are unique
    return vals
      .sort((a, b) => {
        return a.moniker?.localeCompare(b.moniker || '', undefined, {
          sensitivity: "accent",
        })!;
      })
      .filter((v) => !v.jailed)
      .reduce((acc, cur) => {
        if (!uniquesDict[cur.address]) {
          uniquesDict[cur.address] = true;
          acc.push(cur);
        }
        return acc;
      }, [] as typeof vals)
  });

  // delegator validators query
  const delegatorValidatorsQuery = useQuery(
    ["delegator-validators", contractAddress],
    async () => {
      if (!contractAddress) return;
      const res = await fetch(
        `${await getRestEndpoint()}/cosmos/staking/v1beta1/delegations/${contractAddress}`
      );
      const data = await res.json();
      return data.delegation_responses as {
        delegation: {
          delegator_address: string;
          validator_address: string;
        }  
        shares: string;
        balance: {
          denom: string;
          amount: string;
        };
      }[];
    }
  );

  const [amount, setAmount] = useState("");
  const [validator, setValidator] = useState("");

  type ExecuteMsg = {
    release_tokens?: {
      amount: string;
    };
    distribution?: {
      withdraw_delegator_reward: {
        validator: string;
      };
    };
    staking?: {
      delegate?: {
        validator: string;
        amount: {
          denom: string;
          amount: string;
        };
      };
      undelegate?: {
        validator: string;
        amount: {
          denom: string;
          amount: string;
        };
      };
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
      <Heading as="h1" size="xl" mb={4}>
        {vestingContractQuery.data?.label || "loading..."}
      </Heading>
      <Heading as="h2" size="lg" mb={4}>
        Operator Tools
      </Heading>
      {/* ACTIONS (EXECUTE MSGS) */}
      <Tabs>
        <TabList>
          <Tab>Release Tokens</Tab>
          <Tab>Claim Rewards</Tab>
          <Tab>Delegate</Tab>
          <Tab>Undelegate</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            Release vested tokens. These tokens will go to the recipient address
            defined below.{" "}
            {`You can only release tokens if you are the operator of this contract.`}
            <Spacer></Spacer>
            <Button
              disabled={
                accountInfoContractQuery.data?.operator == address
                  ? false
                  : true
              }
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
              Release {humanReadableReleasableTokens?.toString()}
            </Button>
          </TabPanel>
          <TabPanel>
            Claim staking rewards to you recipient address. These tokens will go
            to the recipient address defined below.{" "}
            {`You can only release tokens if you are the operator of this contract.`}
            <Spacer></Spacer>
            <Select
              placeholder="Select validator"
              onChange={(e) => setValidator(e.target.value)}
              mt={4}
            >
              {delegatorValidatorsQuery.data?.map((v) => (
                <option key={v.delegation.validator_address + v.delegation.delegator_address} value={v.delegation.validator_address}>
                  {
                    validatorsQuery.data?.find(
                      (val) => val.address == v.delegation.validator_address
                    )?.moniker
                  }
                </option>
              ))}
            </Select>
            <Button
              disabled={
                accountInfoContractQuery.data?.operator == address
                  ? false
                  : true
              }
              onClick={async () => {
                executeContractMutation.mutate({
                  distribution: {
                    withdraw_delegator_reward: {
                      validator: validator,
                    },
                  },
                });
              }}
              isLoading={executeContractMutation.isLoading}
              colorScheme="green"
              mt={4}
            >
              Withdraw{" "}
              {(+(withdrawableDelegatorRewards.data || 0) / 1000000).toFixed(6)}{" "}
              JUNO Rewards
            </Button>
          </TabPanel>
          <TabPanel>
            Delegate tokens to a validator. Only the operator of this contract
            can delegate tokens. The withdrawal address is the recipient address
            defined below.
            <Spacer></Spacer>
            {/* validator select */}
            <FormControl id="validator" isRequired>
              <FormLabel>Validator</FormLabel>
              <Select
                placeholder="Select validator"
                onChange={(e) => {
                  setValidator(e.target.value);
                }}
              >
                {validatorsQuery.data?.map((validator) => (
                  <option
                    key={validator.address}
                    value={validator.address}
                  >
                    {validator.moniker}
                  </option>
                ))}
              </Select>
            </FormControl>
            {/* amount input */}
            <FormControl id="amount" isRequired>
              <FormLabel>Amount (JUNO)</FormLabel>
              <Input
                placeholder="Amount"
                type="number"
                onChange={(e) => {
                  setAmount((+(e.target.value || 0) * 1000000).toFixed(0));
                }}
              />
            </FormControl>
            <Spacer></Spacer>
            <Button
              disabled={
                accountInfoContractQuery.data?.operator == address
                  ? false
                  : true
              }
              onClick={() => {
                executeContractMutation.mutate({
                  staking: {
                    delegate: {
                      validator: validator,
                      amount: {
                        denom: "ujuno",
                        amount: amount,
                      },
                    },
                  },
                });
              }}
              isLoading={executeContractMutation.isLoading}
              colorScheme="green"
              mt={4}
            >
              Delegate
            </Button>
          </TabPanel>
          <TabPanel>
            Undelegate tokens from a validator. Only the operator of this
            contract can undelegate tokens.
            <Spacer></Spacer>
            {/* validator select */}
            <FormControl id="validator" isRequired>
              <FormLabel>Validator</FormLabel>
              <Select
                placeholder="Select validator"
                onChange={(e) => {
                  setValidator(e.target.value);
                }}
              >
                {validatorsQuery.data?.map((validator) => (
                  <option
                    key={validator.address}
                    value={validator.address}
                  >
                    {validator.moniker}
                  </option>
                ))}
              </Select>
            </FormControl>
            {/* amount input */}
            <FormControl id="amount" isRequired>
              <FormLabel>Amount (JUNO)</FormLabel>
              <Input
                placeholder="Amount"
                type="number"
                onChange={(e) => {
                  setAmount((+(e.target.value || 0) * 1000000).toFixed(0));
                }}
              />
            </FormControl>
            <Spacer></Spacer>
            <Button
              disabled={
                accountInfoContractQuery.data?.operator == address
                  ? false
                  : true
              }
              onClick={() => {
                executeContractMutation.mutate({
                  staking: {
                    undelegate: {
                      validator: validator,
                      amount: {
                        denom: "ujuno",
                        amount: amount,
                      },
                    },
                  },
                });
              }}
              isLoading={executeContractMutation.isLoading}
              colorScheme="green"
              mt={4}
            >
              Undelegate
            </Button>
          </TabPanel>
        </TabPanels>
      </Tabs>
      <Heading as="h2" size="lg" mb={4}>
        Contract Metadata
      </Heading>
      <Grid
        gridGap={4}
        gridTemplateColumns={{
          base: "repeat(1, 1fr)",
          md: "repeat(2, 1fr)",
        }}
      >
        {/* total staked */}
        <StackItem>
          <Heading as="h2" size="md" mb={4}>
            Total Staked
          </Heading>
          <Code>
            {+(totalStakeQuery.data?.toString() || 0) / 1000000 || "loading..."}{" "}
            JUNO
          </Code>
        </StackItem>
        {/* releaseable tokens */}
        <StackItem>
          <Heading as="h2" size="md" mb={4}>
            Releasable Tokens
          </Heading>
          <Code>
            {humanReadableReleasableTokens?.toString() || "loading..."}
          </Code>
        </StackItem>
        {/* show the user whether they can execute the contract in a visually attractive way */}
        <StackItem>
          <Heading as="h2" size="md" mb={4}>
            Can Execute
          </Heading>
          <Code>
            {JSON.stringify(canExecuteContractQuery.data) || "loading..."}
          </Code>
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
                  +(
                    accountInfoContractQuery.data?.vesting_plan.Continuous
                      .start_at ?? 0
                  ) / 1000000
                ).toLocaleString()}
              </Code>
              -
              <Code>
                {new Date(
                  +(
                    accountInfoContractQuery.data?.vesting_plan.Continuous
                      .end_at || 0
                  ) / 1000000
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
                {JSON.stringify(tokenInfoContractQuery.data, null, 2) || "loading..."}
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
                Admin
              </Heading>
              <Code>
                {vestingContractQuery.data?.admin ??
                vestingContractQuery.isLoading
                  ? "loading..."
                  : "None"}
              </Code>
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
      </Grid>
    </Box>
  );
}
