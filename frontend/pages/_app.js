import App, { Container } from 'next/app';
import { ApolloProvider } from'react-apollo';

import withData from '../lib/withData';
import Page from '../components/Page';

class MyApp extends App {
  // In NextJS this runs on app load
  // This exposes initial props of the component to the render method
  // Required for Apollo SSR to work
  static async getInitialProps({ Component, ctx }) {
    let pageProps = {};

    // This crawls all pages on on the app, fetches the data necessary for render and returns it
    if(Component.getInitialProps) {
      pageProps = await Component.getInitialProps(ctx);
    }
    pageProps.query = ctx.query;
    return { pageProps };
  }

  render() {
    const {
      Component,
      apollo,
      pageProps,
    } = this.props;

    return (
      <Container>
        <ApolloProvider client={apollo}>
          <Page>
            <Component {...pageProps} />
          </Page>
        </ApolloProvider>
      </Container>
    );
  }
};

export default withData(MyApp);