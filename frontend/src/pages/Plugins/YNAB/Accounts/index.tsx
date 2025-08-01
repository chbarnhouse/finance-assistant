import React from "react";
import PageSection from "../../../components/PageSection";
import ListAccounts from "./ListAccounts";

export default function YNABAccountsPage() {
  return (
    <>
      <PageSection title="">
        <ListAccounts />
      </PageSection>
      {/* TODO: Add sections for POST /accounts and GET /accounts/{id} */}
    </>
  );
}
