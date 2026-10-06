// REPLACES the earlier logged-in QuestionnairePage.tsx. Now a thin wrapper around QuestionnaireView.

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import api from "../../lib/api";
import QuestionnaireView, { QuestionnaireData, downloadCertificatePdf } from "../../components/QuestionnaireView";

export default function QuestionnairePage() {
  const [data, setData] = useState<QuestionnaireData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/participant/questionnaire");
        setData(res.data.data);
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Failed to load the questionnaire.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Layout>
      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600" />
        </div>
      ) : !data ? (
        <p className="text-gray-600 dark:text-gray-400">No registration found for the active event.</p>
      ) : (
        <QuestionnaireView
          data={data}
          submit={async (answers) => (await api.post("/participant/questionnaire", { answers })).data}
          onDownload={() => downloadCertificatePdf("/participant/certificate")}
        />
      )}

      <div className="pb-20" />
    </Layout>
  );
}