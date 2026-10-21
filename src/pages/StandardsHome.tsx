import { useEffect, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet";
import { markup } from "@/standards/markup";
import { mount } from "@/standards/app";

/* Preferred Recruit · College Track & Field Standards (2026 redesign).
   One app for "/" and "/schools/:schoolSlug" so the old school URLs keep working; the app handles tabs, schools, results and chat. */
const StandardsHome = () => {
  const { schoolSlug, teamSlug } = useParams<{ schoolSlug?: string; teamSlug?: string }>();
  const root = useRef<HTMLDivElement>(null);
  const priv = /^\/(onboarding|account)$/.test(useLocation().pathname);   /* account pages: never indexed */

  useEffect(() => {
    mount({ slug: schoolSlug, team: teamSlug });
  }, [schoolSlug, teamSlug]);

  return (
    <>
      {/* school pages get their title + description from the app once the school's data has loaded */}
      <Helmet>
        {!schoolSlug && !teamSlug && <title>College Track &amp; Field Recruiting Standards &amp; Rankings 2026-27</title>}
        {!schoolSlug && !teamSlug && (
          <meta
            name="description"
            content="Recruiting standards for every college track and field program: walk-on, recruit and scholarship times for NCAA D1, D2, D3 and NAIA, plus results since 2016."
          />
        )}
        {priv && <meta name="robots" content="noindex, nofollow" />}
        <link rel="canonical" href={`https://trackandfieldstandards.com${schoolSlug ? `/schools/${schoolSlug}` : teamSlug ? `/teams/${teamSlug}` : "/"}`} />
      </Helmet>
      <div ref={root} className="pr-standards" dangerouslySetInnerHTML={{ __html: markup }} />
    </>
  );
};

export default StandardsHome;
