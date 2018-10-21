import React, { Component } from 'react';
import styled, { ThemeProvider } from 'styled-components';

import Meta from './Meta';
import Header from './Header';


class Page extends Component {
  render() {
    return (
      <StyledPage>
        <Meta />
        <Header />
        <Inner>
          {this.props.children}
        </Inner>
      </StyledPage>
    );
  }
}

export default Page;

const theme = {
  red: '#FF000',
  black: '#393939',
  grey: '#3A3A3A',
  lightgrey: '#E1E1E1',
  offWhite: '#EDEDED',
  maxWidth: '1000px',
  bs: '0 12px 24px 0 rgba(0, 0, 0, 0.09)',
};

const StyledPage = styled.div`
  background: white;
  color: black;
`;

const Inner = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
`;