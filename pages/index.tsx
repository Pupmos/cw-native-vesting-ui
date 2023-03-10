import {
  Box,
  Button,
  Heading,
  HStack,
  Stack,
  StackItem,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ButtonShape } from "@cosmology-ui/utils";
import { useChain } from "@cosmos-kit/react";
import Link from "next/link";
import { useQuery } from "react-query";
import { ConnectWalletButton } from "../components";
import { chainName, cwVestingCodeIds } from "../config";

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
    const contractAddrs = (await Promise.all(cwVestingCodeIds.map(
      async (codeId) => {
        const contractAddrs = await client.getContracts(codeId.codeId);
        return contractAddrs;
      }
    ))).flat();
    const contracts = await Promise.all(
      contractAddrs.map(async (addr) => {
        const contract = await client.getContract(addr);
        return contract;
      })
    );
    return contracts;
  });
  return (
    <Box w={"full"}>
      <Heading ml={6} as="h2" size="xl">
        Vesting Contracts
      </Heading>
      <Stack mt={16} ml={10}>
        {vestingContractsQuery.data?.map((contract) => {
          return (
            <Link
              key={contract.address}
              href={`/contracts/${contract.address}`}
            >
              <Box
                cursor="pointer"
                bg="gray.50"
                _dark={{ bg: "gray.700" }}
                rounded={"xl"}
                shadow="sm"
                w="full"
              >
                <VStack px={4} py={6} textAlign='left' alignItems={'flex-start'}>
                  <Heading size={"md"}>{contract.label}</Heading>
                  {/* chakra ui ellipsis */}
                  <Text
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                    fontFamily={'mono'}
                    w={"full"}
                  >
                    {contract.address}
                  </Text>
                </VStack>
              </Box>
            </Link>
          );
        })}
      </Stack>
    </Box>
  );
}
