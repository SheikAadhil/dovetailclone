import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
  render,
} from '@react-email/components';
import * as React from 'react';

interface WeeklyDigestEmailProps {
  channelName: string;
  newMessageCount: number;
  themes: { name: string; summary: string; data_point_count: number }[];
  dashboardUrl: string;
}

export const WeeklyDigestEmail = ({
  channelName,
  newMessageCount,
  themes,
  dashboardUrl,
}: WeeklyDigestEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your weekly Pulse digest for {channelName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Weekly Digest: {channelName}</Heading>
          <Text style={text}>
            You have <strong>{newMessageCount}</strong> new messages this week.
          </Text>
          
          <Section style={section}>
            <Heading style={h2}>Top Themes</Heading>
            {themes.length > 0 ? (
              themes.map((theme, index) => (
                <div key={index} style={themeItem}>
                  <Text style={themeTitle}>
                    <strong>{theme.name}</strong> ({theme.data_point_count} messages)
                  </Text>
                  <Text style={themeSummary}>{theme.summary}</Text>
                </div>
              ))
            ) : (
              <Text style={text}>No themes identified this week.</Text>
            )}
          </Section>

          <Section style={btnContainer}>
            <Button style={button} href={dashboardUrl}>
              View Full Report
            </Button>
          </Section>

          <Hr style={hr} />
          
          <Text style={footer}>
            Pulse Customer Intelligence • 123 Tech Lane, San Francisco, CA
          </Text>
          <Link href="#" style={footerLink}>Unsubscribe</Link>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  padding: '0 48px',
};

const h2 = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  padding: '0 48px',
};

const text = {
  color: '#555',
  fontSize: '16px',
  lineHeight: '24px',
  padding: '0 48px',
};

const section = {
  padding: '0 48px',
};

const themeItem = {
  padding: '12px 0',
  borderBottom: '1px solid #eee',
};

const themeTitle = {
  fontSize: '16px',
  margin: '0',
};

const themeSummary = {
  fontSize: '14px',
  color: '#777',
  margin: '4px 0 0',
};

const btnContainer = {
  textAlign: 'center' as const,
  padding: '32px 48px',
};

const button = {
  backgroundColor: '#4f46e5',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '200px',
  margin: '0 auto',
  padding: '12px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
  padding: '0 48px',
};

const footerLink = {
  color: '#8898aa',
  fontSize: '12px',
  textAlign: 'center' as const,
  display: 'block',
};
