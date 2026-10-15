import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { markup } from "@/standards/markup";
import { mount } from "@/standards/app";

/* Preferred Recruit · College Track & Field Standards (2026 redesign).
   One app for "/" and "/schools/:schoolSlug" so the old school URLs keep working; the app handles tabs, schools, results and chat. */
const StandardsHome = () => {
  const { schoolSlug } = useParams<{ schoolSlug?: string }>();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mount({ slug: schoolSlug });
  }, [schoolSlug]);

  return (
    <>
      {/* school pages get their title + description from the app once the school's data has loaded */}
      <Helmet>
        {!schoolSlug && <title>College Track &amp; Field Standards, NCAA Results &amp; Recruiting AI | Preferred Recruit</title>}
        {!schoolSlug && (
          <meta
            name="description"
            content="Recruiting standards for every college track and field program (NCAA D1, D2, D3 and NAIA), every NCAA result since 2016, and a recruiting AI. Enter your mark and see which colleges you fit."
          />
        )}
        <link rel="canonical" href={`https://trackandfieldstandards.com${schoolSlug ? `/schools/${schoolSlug}` : "/"}`} />
      </Helmet>
      <div ref={root} className="pr-standards" dangerouslySetInnerHTML={{ __html: markup }} />
    </>
  );
};

export default StandardsHome;
