import {
  Box,
  Button,
  Center,
  Drawer,
  DrawerContent,
  DrawerOverlay,
  Flex,
  Grid,
  IconButton,
  Image,
  Link as ChakraLink,
  Stack,
  Text,
  useColorMode,
  useDisclosure,
} from "@chakra-ui/react";
import NextLink from "next/link";
import React from "react";
import { IconType } from "react-icons";
import { FiChevronLeft, FiMenu, FiMoon, FiSun } from "react-icons/fi";

import {
  ConnectWalletButton,
  CopyAddressButton,
  ChangeChainDropdown,
} from "@cosmology-ui/utils";

import * as cosutils from "@cosmology-ui/utils";

import {
  chainassets,
  chainName,
  coin,
  dependencies,
  products,
} from '../../config';

import { WalletStatus } from '@cosmos-kit/core';
import {
  Product,
  Dependency,
  WalletSection,
  handleChangeColorModeValue,
} from '../../components';
import { cosmos } from 'juno-network';
import { useChain } from '@cosmos-kit/react';


type IconTypeProps = string | IconType | JSX.Element | React.ReactNode | any;
type DefaultLinkItemType = {
  text: string;
  icon?: IconTypeProps;
};
type CategoryComponentType = {
  label: string;
  href: string;
};
interface LinkListType extends CategoryComponentType {
  icon?: React.ReactNode;
}
type SimpleLayoutType = {
  logo?: React.ReactNode;
  connectButton?: React.ReactNode;
  links?: LinkListType[];
  customLink?: Function;
  chainDropdown?: React.ReactNode;
  copyAddressButton?: React.ReactNode;
  isFullWidth?: boolean;
  children: React.ReactNode;
};
interface SimpleLayoutMenuType extends SimpleLayoutType {
  toggleColorMode: () => void;
}


const MenuLinkButton = ({ icon, text }: DefaultLinkItemType) => {
  const { colorMode } = useColorMode();

  return (
    <Button
      title={text}
      display="flex"
      variant="ghost"
      justifyContent="start"
      alignItems="center"
      fontSize="lg"
      fontWeight="medium"
      textAlign="start"
      px={2}
      w="full"
      h="full"
      minH={10}
      maxH="fit-content"
      whiteSpace="break-spaces"
      lineHeight={1.1}
      _hover={{
        bg: handleChangeColorModeValue(colorMode, "gray.200", "gray.700"),
      }}
      _focus={{ boxShadow: "0 0 0 2px #C47CCF" }}
    >
      <Stack isInline={true} spacing={2} alignItems="center">
        {icon}
        <Text>{text}</Text>
      </Stack>
    </Button>
  );
};

const MobileMenu = ({
  isFullWidth,
  logo,
  connectButton,
  links,
  customLink,
  chainDropdown,
  copyAddressButton,
  toggleColorMode,
  children,
}: SimpleLayoutMenuType) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { colorMode } = useColorMode();

  return (
    <Box>
      {/* navbar */}
      <Flex
        justify="space-between"
        position="fixed"
        align="center"
        top={0}
        left={0}
        right={0}
        minH={12}
        py={2.5}
        px={4}
        zIndex="sticky"
        bg={handleChangeColorModeValue(colorMode, "white", "gray.800")}
        boxShadow={handleChangeColorModeValue(
          colorMode,
          "0 2px 2px -1px #d8d8d8",
          "0 2px 2px -1px #181818, 0 3px 5px -4px #0b0b0b"
        )}
      >
        <IconButton
          aria-label="menu"
          variant="outline"
          icon={<FiMenu opacity={0.8} />}
          _focus={{ outline: "none" }}
          onClick={onOpen}
        />
        {logo}
        <IconButton
          aria-label="color mode"
          variant="outline"
          icon={handleChangeColorModeValue(
            colorMode,
            <FiMoon opacity={0.6} />,
            <FiSun opacity={0.8} />
          )}
          _focus={{ outline: "none" }}
          onClick={toggleColorMode}
        />
      </Flex>
      {/* drawer */}
      <Drawer
        placement="left"
        isFullHeight={true}
        onClose={onClose}
        isOpen={isOpen}
      >
        <DrawerOverlay />
        <DrawerContent maxW={isFullWidth ? "full" : "xs"}>
          <Grid
            templateRows="auto 1fr auto"
            position="absolute"
            top={0}
            right={0}
            left={0}
            bottom={0}
          >
            <Flex justify="end" p={4}>
              <IconButton
                aria-label="close"
                icon={<FiChevronLeft opacity={0.7} />}
                variant="outline"
                fontSize="xl"
                borderRadius="lg"
                _focus={{ outline: "none" }}
                onClick={onClose}
              />
            </Flex>
            <Box position="relative">
              <Stack
                position="absolute"
                top={0}
                bottom={0}
                left={0}
                right={0}
                pl={4}
                pr={2}
                overflowY="scroll"
                css={{
                  // For Firefox
                  scrollbarWidth: "thin",
                  // For Chrome and other browsers except Firefox
                  "&::-webkit-scrollbar": {
                    width: "10px",
                    background: "transparent",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    background: handleChangeColorModeValue(
                      colorMode,
                      "rgba(0,0,0,0.1)",
                      "rgba(255,255,255,0.1)"
                    ),
                    borderRadius: "6px",
                    border: "3px solid",
                    borderColor: handleChangeColorModeValue(
                      colorMode,
                      "#fff",
                      "#2D3748"
                    ),
                  },
                }}
              >
                {links?.map(({ label, href, icon }) => (
                  <>
                    {customLink ? (
                      customLink(label, href)
                    ) : (
                      <NextLink href={href} passHref={true}>
                        <ChakraLink _focus={{ textDecoration: "none" }}>
                          <MenuLinkButton text={label} icon={icon} />
                        </ChakraLink>
                      </NextLink>
                    )}
                  </>
                ))}
              </Stack>
            </Box>
            <Box position="relative" bottom={0} left={0} right={0} p={4}>
              {connectButton}
            </Box>
          </Grid>
        </DrawerContent>
      </Drawer>
      {/* content */}
      <Box
        position="fixed"
        top="3.75rem"
        bottom={16}
        left={0}
        right={0}
        overflowY="scroll"
        css={{
          // For Firefox
          scrollbarWidth: "thin",
          // For Chrome and other browsers except Firefox
          "&::-webkit-scrollbar": {
            width: "10px",
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            background: handleChangeColorModeValue(
              colorMode,
              "rgba(0,0,0,0.1)",
              "rgba(255,255,255,0.1)"
            ),
            borderRadius: "6px",
            border: "3px solid",
            borderColor: handleChangeColorModeValue(
              colorMode,
              "#fff",
              "#1A202C"
            ),
          },
        }}
      >
        {children}
      </Box>
      <Box
        position="fixed"
        bottom={0}
        left={2}
        right={2}
        p={4}
        display="flex"
        justifyContent="center"
        zIndex="dropdown"
        w="auto"
        h="auto"
        lineHeight="shorter"
        bg={handleChangeColorModeValue(colorMode, "white", "gray.800")}
        borderRadius="6px 6px 0 0"
        boxShadow={handleChangeColorModeValue(
          colorMode,
          "0 0px 2px #e3e3e3, 0 0 16px -6px #c4c4c4",
          "0 -4px 5px #555"
        )}
        color={handleChangeColorModeValue(colorMode, "gray.700", "white")}
      >
        <Grid
          templateColumns={{ base: "1fr", md: "1fr 1fr" }}
          justifyContent="center"
          alignItems="center"
          w="full"
          gap={4}
        >
          <Box w="full" maxW={72} mx="auto">
            {chainDropdown}
          </Box>
          {copyAddressButton && (
            <Box w="full" maxW={72} mx="auto">
              {copyAddressButton}
            </Box>
          )}
        </Grid>
      </Box>
    </Box>
  );
};

const DesktopMenu = ({
  logo,
  connectButton,
  links,
  customLink,
  chainDropdown,
  copyAddressButton,
  toggleColorMode,
  children,
}: SimpleLayoutMenuType) => {
  const { colorMode } = useColorMode();
  const colorModeIcon = handleChangeColorModeValue(
    colorMode,
    <FiMoon opacity={0.6} />,
    <FiSun opacity={0.7} />
  );

  return (
    <Flex>
      {/* sidebar */}
      <Stack
        spacing={4}
        position="fixed"
        top={0}
        bottom={0}
        left={0}
        minW={52}
        w="full"
        maxW={60}
        boxShadow={handleChangeColorModeValue(
          colorMode,
          "1px 0 1px #E2E8F0",
          "1px 0 1px rgba(255, 255, 255, 0.16)"
        )}
      >
        {logo && (
          <Flex justify="center" align="center" p={4} pb={0}>
            {logo}
          </Flex>
        )}
        <Stack
          flex={1}
          pl={4}
          pr={1.5}
          py={2}
          overflowY="scroll"
          css={{
            // For Firefox
            scrollbarWidth: "thin",
            // For Chrome and other browsers except Firefox
            "&::-webkit-scrollbar": {
              width: "10px",
              background: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              background: handleChangeColorModeValue(
                colorMode,
                "rgba(0,0,0,0.1)",
                "rgba(255,255,255,0.1)"
              ),
              borderRadius: "6px",
              border: "3px solid",
              borderColor: handleChangeColorModeValue(
                colorMode,
                "#fff",
                "#1A202C"
              ),
            },
          }}
        >
          {links?.map(({ label, href, icon }) => {
            return (
              <>
                {customLink ? (
                  customLink(label, href)
                ) : (
                  <NextLink href={href} passHref={true}>
                    <ChakraLink
                      _hover={{ textDecoration: "none" }}
                      _focus={{ outline: "none" }}
                    >
                      <MenuLinkButton text={label} icon={icon} />
                    </ChakraLink>
                  </NextLink>
                )}
              </>
            );
          })}
        </Stack>
        <Flex alignItems={'flex-end'} justifyContent={'flex-end'}>
        {connectButton && (
          <Center position="relative" w="full" pt={0}>
            {connectButton}
          </Center>
        )}
        </Flex>
      </Stack>
      {/* navbar */}
      <Box position="fixed" top={0} left={60} right={0} zIndex="sticky" px={4}>
        <Stack
          isInline={true}
          justifyContent="end"
          alignItems="center"
          bg={handleChangeColorModeValue(colorMode, "white", "gray.800")}
          boxShadow={handleChangeColorModeValue(
            colorMode,
            "0 1px 1px #E2E8F0",
            "0 1px 1px rgba(255, 255, 255, 0.16)"
          )}
          py={4}
        >
          <Box w="full" maxW={72}>
            {chainDropdown}
          </Box>
          {copyAddressButton && (
            <Center
              justifyContent="center"
              alignItems="center"
              w="full"
              maxW={60}
              minW="fit-content"
            >
              {copyAddressButton}
            </Center>
          )}
          <IconButton
            display="flex"
            aria-label="color mode"
            variant="outline"
            w={12}
            h={12}
            borderRadius="lg"
            icon={colorModeIcon}
            fontSize="lg"
            _hover={{
              bg: handleChangeColorModeValue(
                colorMode,
                "blackAlpha.50",
                "whiteAlpha.100"
              ),
            }}
            _focus={{ outline: "none" }}
            onClick={toggleColorMode}
          />
        </Stack>
      </Box>
      {/* content */}
      <Box
        position="fixed"
        top={20}
        left={60}
        bottom={0}
        right={0}
        overflowY="scroll"
        css={{
          // For Firefox
          scrollbarWidth: "thin",
          // For Chrome and other browsers except Firefox
          "&::-webkit-scrollbar": {
            width: "10px",
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            background: handleChangeColorModeValue(
              colorMode,
              "rgba(0,0,0,0.1)",
              "rgba(255,255,255,0.1)"
            ),
            borderRadius: "6px",
            border: "3px solid",
            borderColor: handleChangeColorModeValue(
              colorMode,
              "#fff",
              "#1A202C"
            ),
          },
        }}
      >
        <Box p={4}>{children}</Box>
      </Box>
    </Flex>
  );
};

const SimpleLayout = ({
  logo,
  connectButton,
  links,
  customLink,
  chainDropdown,
  copyAddressButton,
  isFullWidth,
  children,
}: SimpleLayoutType) => {
  const { toggleColorMode } = useColorMode();

  return (
    <Box w="full" h="full">
      <Box display={{ base: "none", lg: "block" }} w="full" h="auto">
        <DesktopMenu
          logo={logo}
          connectButton={connectButton}
          links={links}
          customLink={customLink}
          // chainDropdown={chainDropdown}
          copyAddressButton={copyAddressButton}
          toggleColorMode={toggleColorMode}
        >
          {children}
        </DesktopMenu>
      </Box>
      <Box display={{ base: "block", lg: "none" }} w="full" h="full">
        <MobileMenu
          isFullWidth={isFullWidth}
          logo={logo}
          connectButton={connectButton}
          links={links}
          customLink={customLink}
          // chainDropdown={chainDropdown}
          copyAddressButton={copyAddressButton}
          toggleColorMode={toggleColorMode}
        >{children}</MobileMenu>

      </Box>
    </Box>
  );
};

// component with children
export default function Layout (
  props: { children: React.ReactNode }
) {
  const logo = (
    <Box w={{ base: 10, lg: 20 }} h={{ base: 10, lg: 20 }}>
      <Image src="/logo.png" />
    </Box>
  );
  const linkItems = [
    {
      label: "⚡️ Vesting Contracts",
      href: "/",
    },
    {
      label: "🚀  Vest Tokens",
      href: "/vest",
    },
    {
      label: "📖 How it Works",
      href: "/how-it-works",
    },
    // {
    //   label: "🔧 Cosmos Kit",
    //   href: "https://github.com/cosmology-tech/cosmos-kit",
    // },
    // {
    //   label: "🔨 OsmoJS",
    //   href: "https://github.com/osmosis-labs/osmojs",
    // },
    // {
    //   label: "🔭 Telescope",
    //   href: "https://github.com/osmosis-labs/telescope",
    // },
    // {
    //   label: "🌱 TS Codegen",
    //   href: "https://github.com/CosmWasm/ts-codegen",
    // },
    // {
    //   label: "🪐 Cosmology",
    //   href: "https://github.com/cosmology-tech/cosmology",
    // },
    // {
    //   label: "✏️ Chain Registry",
    //   href: "https://github.com/cosmology-tech/chain-registry",
    // },
  ];

  const { getSigningStargateClient, address, status, getRpcEndpoint, getCosmWasmClient } = useChain(chainName);

  return (
    <Box w="full" h="full" minH={'100vh'}>
      <SimpleLayout
        logo={logo}
        connectButton={<WalletSection></WalletSection>}
        links={linkItems}
        // chainDropdown={<ChangeChainDropdown />}
        copyAddressButton={<CopyAddressButton address={address} />}
        isFullWidth={false}
      >
        {/* <Box mx="auto" w="full" maxW={56} py={6}> */}
          {props.children}
        {/* </Box> */}
      </SimpleLayout>
    </Box>
  );
}
