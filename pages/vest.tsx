import {
  Box,
  Button,
  Code,
  Container,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  Heading,
  HStack,
  Input,
  Spacer,
  Stack,
  StackItem,
  useToast,
  Text,
} from "@chakra-ui/react";
import { ButtonShape } from "@cosmology-ui/utils";
import { useChain } from "@cosmos-kit/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "react-query";
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
const datetimeLocalNow = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, -1);
d = new Date(d.getTime() + 1000 * 60 * 60 * 24 * 7);
const datetimeLocalLater = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, -1);
export default function VestingContracts() {
  const {
    getSigningStargateClient,
    address,
    status,
    getRpcEndpoint,
    getCosmWasmClient,
    getSigningCosmWasmClient,
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
    recipient: "",
    operator: "",
    oversight: "",
  });
  const [contractLabel, setContractLabel] = useState("");
  const instantiateAmount = useMemo(() => {
    if (!instantiateMsgDraft.amount) return "0";
    return Math.floor(+instantiateMsgDraft.amount * 1000000).toFixed(0);
  }, [instantiateMsgDraft.amount]);
  const [instantiateAdmin, setInstantiateAdmin] = useState("");
  const instantiateMsg = useMemo(() => {
    return {
      denom: "ujuno",
      // Recipient - this is the account that receives the tokens once they have been vested and released. This cannot be changed. Tokens not released for whatever reason will be effectively burned, so SOB cannot repurpose them.
      recipient: instantiateMsgDraft.recipient,
      // Operator - this is either the validator or an optional delegation to an "operational" employee from SOB, which can approve the payout of fully vested tokens to the final recipient. They cannot do anything else
      operator: instantiateMsgDraft.operator,
      // Oversight - this is a secure multi-sig from SOB, which can be used in extraordinary circumstances, to change the Operator, or to halt the release of future tokens in the case of misbehaviour.
      oversight: instantiateMsgDraft.oversight,
      vesting_plan: {
        Continuous: {
          // in nanoseconds
          start_at: (
            new Date(instantiateMsgDraft.start_time).getTime() * 1000000
          ).toFixed(0),
          // in nanoseconds
          end_at: (
            new Date(instantiateMsgDraft.end_time).getTime() * 1000000
          ).toFixed(0),
        },
      },
    };
  }, [
    instantiateMsgDraft.start_time,
    instantiateMsgDraft.end_time,
    instantiateMsgDraft.recipient,
    instantiateMsgDraft.operator,
    instantiateMsgDraft.oversight,
  ]);
  const toast = useToast();

  // react-query mutation to instantiate a contract
  const { mutate: instantiateContract, isLoading: isInstantiating } =
    useMutation(
      async () => {
        if (!address) {
          throw new Error("No wallet connected");
        }
        const client = await getSigningCosmWasmClient();
        const contract = await client.instantiate(
          address,
          cwVestingCodeId,
          instantiateMsg,
          contractLabel,
          {
            gas: "2000000",
            amount: [{ denom: "ujuno", amount: "10000000" }],
          },
          {
            funds: [{ denom: "ujuno", amount: `${instantiateAmount}` }],
            ...(
              !!instantiateAdmin ? {
                admin: instantiateAdmin,
              } : {}
            )
          }
        );
        return contract;
      },
      {
        onSuccess: () => {
          toast({
            title: "Vesting Contract Instantiated",
            description: "Your vesting contract has been instantiated.",
            status: "success",
            duration: 5000,
            isClosable: true,
          });
          vestingContractsQuery.refetch();
        },
        onError: (error) => {
          toast({
            title: "Error instantiating contract",
            // @ts-ignore
            description: error?.message || error,
            status: "error",
            duration: 5000,
            isClosable: true,
          });
        },
      }
    );
  return (
    <Container>
      <Heading size="xl" as="h2" gridColumn={0}>
        Create Vesting Contract
      </Heading>
      <Spacer h={2} />
      <Text>
        Create a vesting contract for a new employee, a grant recipient, an
        investor, or an investment.
      </Text>
      <Spacer h={16} />
      {/* display in one column when on mobile devices */}
      <Grid
        display="grid"
        gridTemplateColumns={{ xs: "repeat(1, 1fr)", lg: "repeat(2, 1fr)" }}
        gridGap={10}
      >
        <FormControl isRequired gridColumn={{ xs: 1, lg: 1 }}>
          <FormLabel>Contract Label</FormLabel>
          <Input
            placeholder="Vesting Treetz for Pupmos"
            size="md"
            type="text"
            value={contractLabel}
            onChange={(e) => setContractLabel(e.target.value)}
          />
          {contractLabel}
          <FormHelperText>A label for your contract.</FormHelperText>
        </FormControl>
        <FormControl isRequired gridColumn={{ xs: 1, lg: 2 }}>
          <FormLabel>Amount</FormLabel>
          <Input
            min={0}
            placeholder="Amount (juno)"
            size="md"
            type="number"
            value={instantiateMsgDraft.amount}
            onChange={(e) =>
              setInstantiateMsgDraft({
                ...instantiateMsgDraft,
                amount: e.target.value,
              })
            }
          />
          <FormHelperText>Amount of tokens to be vested.</FormHelperText>
        </FormControl>
        <FormControl isRequired gridColumn={{ xs: 1, lg: 1 }}>
          <FormLabel>Start Date</FormLabel>
          <Input
            placeholder="Start Date (local time)"
            size="md"
            type="datetime-local"
            value={instantiateMsgDraft.start_time}
            onChange={(e) =>
              setInstantiateMsgDraft({
                ...instantiateMsgDraft,
                start_time: e.target.value,
              })
            }
          />
          <FormHelperText>Start Date</FormHelperText>
        </FormControl>
        <FormControl isRequired gridColumn={{ xs: 1, lg: 2 }}>
          <FormLabel>End Date</FormLabel>
          <Input
            placeholder="End Date (local time)"
            size="md"
            type="datetime-local"
            value={instantiateMsgDraft.end_time}
            onChange={(e) =>
              setInstantiateMsgDraft({
                ...instantiateMsgDraft,
                end_time: e.target.value,
              })
            }
          />
          <FormHelperText>End Date</FormHelperText>
        </FormControl>
        <FormControl
          isRequired
          isInvalid={
            !!instantiateMsgDraft.recipient &&
            !isValidAddress(instantiateMsgDraft.recipient)
          }
          gridColumn={1}
        >
          <FormLabel>Recipient</FormLabel>
          <Input
            placeholder="Recipient"
            size="md"
            type="text"
            value={instantiateMsgDraft.recipient}
            onChange={(e) =>
              setInstantiateMsgDraft({
                ...instantiateMsgDraft,
                recipient: e.target.value,
              })
            }
          />
          <FormHelperText>{`This is the account that receives the tokens once they have been vested and released. This cannot be changed. Tokens not released for whatever reason will be effectively burned, so SOB cannot repurpose them.`}</FormHelperText>
        </FormControl>
        <FormControl
          isRequired
          isInvalid={
            !!instantiateMsgDraft.operator &&
            !isValidAddress(instantiateMsgDraft.operator)
          }
          gridColumn={{ xs: 1, lg: 2 }}
        >
          <FormLabel>Operator</FormLabel>
          <Input
            placeholder="Operator"
            size="md"
            type="text"
            value={instantiateMsgDraft.operator}
            onChange={(e) =>
              setInstantiateMsgDraft({
                ...instantiateMsgDraft,
                operator: e.target.value,
              })
            }
          />
          <FormHelperText>
            {`This is either the validator or an optional delegation to an "operational" employee from SOB, which can approve the payout of fully vested tokens to the final recipient. They cannot do anything else`}
          </FormHelperText>
        </FormControl>
        <FormControl
          isRequired
          isInvalid={
            !!instantiateMsgDraft.oversight &&
            !isValidAddress(instantiateMsgDraft.oversight)
          }
          gridColumn={1}
        >
          <FormLabel>Oversight</FormLabel>
          <Input
            placeholder="Oversight"
            size="md"
            type="text"
            value={instantiateMsgDraft.oversight}
            onChange={(e) =>
              setInstantiateMsgDraft({
                ...instantiateMsgDraft,
                oversight: e.target.value,
              })
            }
          />
          <FormHelperText>
            this is a secure multi-sig from SOB, which can be used in
            extraordinary circumstances, to change the Operator, or to halt the
            release of future tokens in the case of misbehaviour.
          </FormHelperText>
        </FormControl>

        <FormControl
          isInvalid={
            !!instantiateAdmin &&
            !isValidAddress(instantiateAdmin)
          }
          gridColumn={1}
        >
          <FormLabel>Contract Admin (optional)</FormLabel>
          <Input
            placeholder="Admin"
            size="md"
            type="text"
            value={instantiateAdmin}
            onChange={(e) =>
              setInstantiateAdmin(e.currentTarget.value)
            }
          />
          <FormHelperText>
            this is a secure multi-sig from SOB, which can be used in
            extraordinary circumstances, to change the Operator, or to halt the
            release of future tokens in the case of misbehaviour.
          </FormHelperText>
        </FormControl>

        <FormControl gridColumn={{ xs: 1, lg: 2 }}>
          <Code>
            <pre>{JSON.stringify(instantiateMsg, null, 2)}</pre>
          </Code>
          <Spacer h={5} />
          <Button
            w="full"
            minW="fit-content"
            size="lg"
            isLoading={isInstantiating}
            isDisabled={
              isInstantiating ||
              !(
                Object.values(instantiateMsgDraft).every((value) => {
                  return value;
                }) && !!contractLabel
              )
            }
            onClick={async () => {
              instantiateContract();
            }}
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
            gridColumn={{ xs: 1, lg: 2 }}
          >
            Create Vesting Contract
          </Button>
        </FormControl>
      </Grid>
      <Spacer h={20} />
    </Container>

    // <Box w={"full"}>
    //   <Heading ml={6} as="h2" size="xl">
    //     Create Vesting Contract
    //   </Heading>

    //   <Stack mt={16} ml={10}>
    //     <FormControl isRequired>
    //       <FormLabel>Contract Label</FormLabel>
    //       <Input
    //         placeholder="Vesting Treetz for Pupmos"
    //         size="md"
    //         type="text"
    //         value={contractLabel}
    //         onChange={(e) => setContractLabel(e.target.value)}
    //       />
    //       {contractLabel}
    //       <FormHelperText>
    //         A label for your contract.
    //       </FormHelperText>
    //     </FormControl>
    //     <FormControl isRequired>
    //       <FormLabel>Amount</FormLabel>
    //       <Input
    //         min={0}
    //         placeholder="Amount (juno)"
    //         size="md"
    //         type="number"
    //         value={instantiateMsgDraft.amount}
    //         onChange={(e) => setInstantiateMsgDraft({ ...instantiateMsgDraft, amount: e.target.value })}
    //       />
    //       <FormHelperText>
    //         Amount of tokens to be vested.
    //       </FormHelperText>
    //     </FormControl>
    //     <FormControl isRequired>
    //       <FormLabel>Start Date</FormLabel>
    //       <Input
    //         placeholder="Start Date (local time)"
    //         size="md"
    //         type="datetime-local"
    //         value={instantiateMsgDraft.start_time}
    //         onChange={(e) => setInstantiateMsgDraft({ ...instantiateMsgDraft, start_time: e.target.value })}
    //       />
    //       <FormHelperText>
    //         Start Date
    //       </FormHelperText>
    //     </FormControl>
    //     <FormControl isRequired>
    //       <FormLabel>End Date</FormLabel>
    //       <Input
    //         placeholder="End Date (local time)"
    //         size="md"
    //         type="datetime-local"
    //         value={instantiateMsgDraft.end_time}
    //         onChange={(e) => setInstantiateMsgDraft({ ...instantiateMsgDraft, end_time: e.target.value })}
    //       />
    //       <FormHelperText>
    //         End Date
    //       </FormHelperText>
    //     </FormControl>
    //     <FormControl isInvalid={!!instantiateMsgDraft.recipient && !isValidAddress(
    //       instantiateMsgDraft.recipient
    //     )} isRequired>
    //       <FormLabel>Recipient</FormLabel>
    //       <Input
    //         placeholder="Recipient"
    //         size="md"
    //         type="text"
    //         value={instantiateMsgDraft.recipient}
    //         onChange={(e) => setInstantiateMsgDraft({ ...instantiateMsgDraft, recipient: e.target.value })}
    //       />
    //       <FormHelperText>
    //         {`this is the account that receives the tokens once they have been vested and released. This cannot be changed. Tokens not released for whatever reason will be effectively burned, so SOB cannot repurpose them.`}
    //       </FormHelperText>
    //     </FormControl>
    // <FormControl isRequired
    //   isInvalid={!!instantiateMsgDraft.operator && !isValidAddress(
    //     instantiateMsgDraft.operator
    //   )}
    // >
    //   <FormLabel>Operator</FormLabel>
    //   <Input
    //     placeholder="Operator"
    //     size="md"
    //     type="text"
    //     value={instantiateMsgDraft.operator}
    //     onChange={(e) => setInstantiateMsgDraft({ ...instantiateMsgDraft, operator: e.target.value })}
    //   />
    //   <FormHelperText>
    //     {`This is either the validator or an optional delegation to an "operational" employee from SOB, which can approve the payout of fully vested tokens to the final recipient. They cannot do anything else`}
    //   </FormHelperText>
    // </FormControl>
    // <FormControl isRequired
    //   isInvalid={!!instantiateMsgDraft.oversight && !isValidAddress(
    //     instantiateMsgDraft.oversight
    //   )}
    // >
    //   <FormLabel>Oversight</FormLabel>
    //   <Input
    //     placeholder="Oversight"
    //     size="md"
    //     type="text"
    //     value={instantiateMsgDraft.oversight}
    //     onChange={(e) => setInstantiateMsgDraft({ ...instantiateMsgDraft, oversight: e.target.value })}
    //   />
    //   <FormHelperText>
    //     this is a secure multi-sig from SOB, which can be used in extraordinary circumstances, to change the Operator, or to halt the release of future tokens in the case of misbehaviour.
    //   </FormHelperText>
    // </FormControl>

    // <Button
    //   w="full"
    //   minW="fit-content"
    //   size="lg"
    //   isLoading={isInstantiating}
    //   isDisabled={isInstantiating || !(Object.values(instantiateMsgDraft).every((value) => {return value}) && !!contractLabel)}
    //   onClick={async () => {
    //     instantiateContract();
    //   }}

    // // isLoading={isLoading}
    // // isDisabled={isDisabled}
    // bgImage="linear-gradient(109.6deg, rgba(157,75,199,1) 11.2%, rgba(119,81,204,1) 83.1%)"
    // color="white"
    // opacity={1}
    // transition="all .5s ease-in-out"
    // _hover={{
    //   bgImage:
    //     "linear-gradient(109.6deg, rgba(157,75,199,1) 11.2%, rgba(119,81,204,1) 83.1%)",
    //   opacity: 0.75,
    // }}
    // _active={{
    //   bgImage:
    //     "linear-gradient(109.6deg, rgba(157,75,199,1) 11.2%, rgba(119,81,204,1) 83.1%)",
    //   opacity: 0.9,
    // }}
    //       // onClick={onClickConnectBtn}
    //     >
    //       {/* <Icon as={icon ? icon : IoWallet} mr={2} /> */}
    //       {/* {buttonText ? buttonText : 'Connect Wallet'} */}
    //       Create Vesting Contract
    //     </Button>
    //     <Spacer
    //       h={10}
    //     />
    //     <Heading
    //       as="h3"
    //       size="md"
    //      >
    //       Raw Data
    //     </Heading>
    //     <Heading
    //       as="h4"
    //       size="sm"
    //     >
    //       Instantiate Msg Draft
    //     </Heading>

    //     <Code>
    //       <pre>
    //       {JSON.stringify(instantiateMsgDraft, null, 2)}
    //       </pre>
    //     </Code>
    //     <Heading
    //       as="h4"
    //       size="sm"
    //     >
    //       Instantiate Msg
    //     </Heading>

    // <Code>
    //   <pre>
    //   {JSON.stringify(instantiateMsg, null, 2)}
    //   </pre>
    // </Code>
    //     <Heading
    //       as="h4"
    //       size="sm"
    //     >
    //       Contract Label
    //     </Heading>
    //     <Code>
    //       <pre>
    //       {JSON.stringify(contractLabel, null, 2)}
    //       </pre>
    //     </Code>
    //     <Heading
    //       as="h4"
    //       size="sm"
    //     >
    //       Instantiate Amount
    //     </Heading>
    //     <Code>
    //       <pre>
    //       funds: {JSON.stringify(instantiateAmount, null, 2)}ujuno
    //       </pre>
    //     </Code>

    //   </Stack>
    // </Box>
  );
}
