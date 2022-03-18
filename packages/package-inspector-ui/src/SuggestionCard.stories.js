// import React from 'react';
// import { ComponentStory, ComponentMeta } from '@storybook/react';

// import SuggestionCard from './SuggestionCard';

// export default {
//   title: 'SuggestionCard',
//   component: SuggestionCard,
// } as ComponentMeta<typeof SuggestionCard>;

// const Template: ComponentStory<typeof SuggestionCard> = (args) => <SuggestionCard {...args} />;

// export const Primary = Template.bind({});

// Primary.args = {
//   suggestion: {
//     id: 'Hello World',
//     name: 'hello-world',
//     message: 'Hello world',
//     actions: [],
//   }
// };

import React from "react";

import SuggestionCard from "./SuggestionCard";

export default {
  title: "SuggestionCard",
  component: SuggestionCard,
};

const Template = (args) => <SuggestionCard {...args} />;

export const Primary = Template.bind({});

Primary.args = {
  suggestion: {
    id: "Hello World",
    name: "hello-world",
    message: "Hello world",
    actions: [],
  },
};
