/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import ConditionDecorator from './ConditionDecorator.js';
import RetryDecorator from './RetryDecorator.js';
import TimeoutDecorator from './TimeoutDecorator.js';


//
// Order is very important, step is decorated top to bottom.
// e.g., [D1, D2, D3] will decorate every step like following.
//
//  D1(D2(D3()))
//
export default [
  TimeoutDecorator,
  RetryDecorator,
  ConditionDecorator,
];
